import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { Inject } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { profiles, users } from '@astalakshimi/database';
import { eq } from 'drizzle-orm';
import { MessageService } from './message.service';

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim());

@WebSocketGateway({
  cors: { origin: allowedOrigins, credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track connected users (verified profileId -> socketId)
  private userSockets = new Map<string, string>();

  constructor(
    private readonly messageService: MessageService,
    private readonly jwtService: JwtService,
    @Inject(DB_CLIENT) private readonly db: Database,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        throw new Error('Missing auth token');
      }

      const payload = this.jwtService.verify<{ sub: string; type?: string }>(token);
      if (!payload?.sub || payload.type === 'refresh') {
        throw new Error('Invalid token');
      }

      // Re-validate account status on connect, mirroring JwtStrategy.
      const [account] = await this.db
        .select({ status: users.status })
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);
      if (!account || account.status !== 'active') {
        throw new Error('Account is not active');
      }

      // Resolve the caller's own profile - the client never gets to choose an identity
      const [profile] = await this.db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.userId, payload.sub))
        .limit(1);
      if (!profile) {
        throw new Error('No profile found for user');
      }

      client.data.profileId = profile.id;
      this.userSockets.set(profile.id, client.id);
    } catch {
      client.emit('unauthorized', { message: 'Authentication required' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const profileId = client.data.profileId as string | undefined;
    if (profileId) {
      this.userSockets.delete(profileId);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { receiverProfileId: string; text: string; threadId: string },
  ) {
    const senderProfileId = client.data.profileId as string | undefined;
    if (!senderProfileId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const result = await this.messageService.processMessage(
        senderProfileId,
        payload.receiverProfileId,
        payload.text,
        payload.threadId
      );

      if (result.status === 'BLOCKED') {
        // Send back the structured blocked response to the sender ONLY
        client.emit('messageBlocked', result);
        return;
      }

      // If ALLOWED, emit to receiver if online
      const receiverSocketId = this.userSockets.get(payload.receiverProfileId);
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit('newMessage', (result as any).message);
      }

      // Also send back to sender for confirmation
      client.emit('messageSent', (result as any).message);

    } catch (error) {
      client.emit('error', { message: error?.message || 'Error processing message' });
    }
  }
}
