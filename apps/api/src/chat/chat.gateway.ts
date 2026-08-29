import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from './message.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track connected users (profileId -> socketId)
  private userSockets = new Map<string, string>();

  constructor(private readonly messageService: MessageService) {}

  handleConnection(client: Socket) {
    const profileId = client.handshake.query.profileId as string;
    if (profileId) {
      this.userSockets.set(profileId, client.id);
    }
  }

  handleDisconnect(client: Socket) {
    const profileId = client.handshake.query.profileId as string;
    if (profileId) {
      this.userSockets.delete(profileId);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { senderProfileId: string; receiverProfileId: string; text: string; threadId: string },
  ) {
    try {
      const result = await this.messageService.processMessage(
        payload.senderProfileId,
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
