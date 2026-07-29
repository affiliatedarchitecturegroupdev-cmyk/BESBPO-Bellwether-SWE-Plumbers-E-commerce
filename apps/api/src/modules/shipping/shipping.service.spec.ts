import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy } from 'jest-mock-extended';
import { ShippingService } from './shipping.service';
import { ShipLogicService } from './shiplogic.service';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('ShippingService', () => {
  let service: ShippingService;
  let prisma: DeepMockProxy<PrismaService>;
  let cartService: { getCart: jest.Mock };
  let shipLogicService: { isConfigured: jest.Mock; getRates: jest.Mock };

  const address = { line1: '10 Midas Ave', city: 'Johannesburg', province: 'Gauteng', postalCode: '2196' };

  beforeEach(async () => {
    prisma = createPrismaMock();
    cartService = { getCart: jest.fn() };
    shipLogicService = { isConfigured: jest.fn(), getRates: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        { provide: PrismaService, useValue: prisma },
        { provide: CartService, useValue: cartService },
        { provide: ShipLogicService, useValue: shipLogicService },
      ],
    }).compile();

    service = module.get(ShippingService);
  });

  it('falls back to the flat fee, without touching the cart at all, when ShipLogic is not configured', async () => {
    shipLogicService.isConfigured.mockReturnValue(false);

    const result = await service.getQuote('sub-1', 'buyer@example.com', address);

    expect(result).toEqual({ source: 'fallback', fee: 150, serviceName: null, options: [] });
    expect(cartService.getCart).not.toHaveBeenCalled();
  });

  it('falls back to the flat fee for an empty cart, without ever calling ShipLogic', async () => {
    shipLogicService.isConfigured.mockReturnValue(true);
    cartService.getCart.mockResolvedValue({ lines: [] });

    const result = await service.getQuote('sub-1', 'buyer@example.com', address);

    expect(result.source).toBe('fallback');
    expect(shipLogicService.getRates).not.toHaveBeenCalled();
  });

  it('falls back to the flat fee when ShipLogic returns no rates', async () => {
    shipLogicService.isConfigured.mockReturnValue(true);
    cartService.getCart.mockResolvedValue({ lines: [{ productId: 'prod-1', quantity: 2 }] });
    prisma.product.findMany.mockResolvedValue([
      { id: 'prod-1', weightKg: 1, lengthCm: 20, widthCm: 15, heightCm: 10 },
    ] as never);
    shipLogicService.getRates.mockResolvedValue(null);

    const result = await service.getQuote('sub-1', 'buyer@example.com', address);

    expect(result.source).toBe('fallback');
  });

  it('picks the cheapest of several real rate options, not just the first one returned', async () => {
    shipLogicService.isConfigured.mockReturnValue(true);
    cartService.getCart.mockResolvedValue({ lines: [{ productId: 'prod-1', quantity: 1 }] });
    prisma.product.findMany.mockResolvedValue([
      { id: 'prod-1', weightKg: 1, lengthCm: 20, widthCm: 15, heightCm: 10 },
    ] as never);
    shipLogicService.getRates.mockResolvedValue([
      { rate: 145, serviceCode: 'ON', serviceName: 'Overnight', serviceDescription: '' },
      { rate: 89.5, serviceCode: 'ECO', serviceName: 'Economy', serviceDescription: '' },
    ]);

    const result = await service.getQuote('sub-1', 'buyer@example.com', address);

    expect(result).toEqual(
      expect.objectContaining({ source: 'shiplogic', fee: 89.5, serviceName: 'Economy' }),
    );
  });

  it('aggregates parcel weight by summing quantity × per-unit weight across every cart line', async () => {
    shipLogicService.isConfigured.mockReturnValue(true);
    cartService.getCart.mockResolvedValue({
      lines: [
        { productId: 'prod-1', quantity: 3 },
        { productId: 'prod-2', quantity: 2 },
      ],
    });
    prisma.product.findMany.mockResolvedValue([
      { id: 'prod-1', weightKg: 1, lengthCm: 20, widthCm: 15, heightCm: 10 },
      { id: 'prod-2', weightKg: 2.5, lengthCm: 30, widthCm: 20, heightCm: 15 },
    ] as never);
    shipLogicService.getRates.mockResolvedValue([
      { rate: 100, serviceCode: 'ECO', serviceName: 'Economy', serviceDescription: '' },
    ]);

    await service.getQuote('sub-1', 'buyer@example.com', address);

    const [, parcels] = shipLogicService.getRates.mock.calls[0];
    expect(parcels[0]).toEqual({ weightKg: 8, lengthCm: 30, widthCm: 20, heightCm: 15 });
  });
});
