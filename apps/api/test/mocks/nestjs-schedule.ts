export const Cron =
  () =>
  (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
    descriptor;

export class ScheduleModule {
  static forRoot() {
    return {
      module: ScheduleModule,
      providers: [],
      exports: [],
    };
  }
}
