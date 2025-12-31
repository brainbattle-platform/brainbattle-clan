import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('return status ok', () => {
    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });

  it('have status as string', () => {
    const result = controller.getHealth();
    expect(typeof result.status).toBe('string');
    expect(result.status).toBe('ok');
  });
});
