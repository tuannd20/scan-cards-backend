import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ResponseInterceptor } from '../../interceptors/response.interceptor';
import { PokemonCardController } from './pokemon-card.controller';
import { PokemonCardService } from './pokemon-card.service';

describe('PokemonCardController', () => {
  let controller: PokemonCardController;
  let interceptor: ResponseInterceptor<unknown>;
  const pokemonCardService = {
    getTrendingCards: jest.fn(),
  };

  const createContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200 }),
        getRequest: () => ({
          url: '/easy-card-scanner/catalog/cards/trending?period=week&direction=both&minChangePercent=5&limit=20',
        }),
      }),
      getHandler: () => controller.getTrendingCards,
      getClass: () => PokemonCardController,
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PokemonCardController],
      providers: [
        {
          provide: PokemonCardService,
          useValue: pokemonCardService,
        },
      ],
    }).compile();

    controller = moduleFixture.get(PokemonCardController);
    interceptor = new ResponseInterceptor(moduleFixture.get(Reflector));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns /easy-card-scanner/catalog/cards/trending with only one response envelope level', async () => {
    pokemonCardService.getTrendingCards.mockResolvedValue({
      period: 'week',
      direction: 'both',
      minChangePercent: 5,
      limit: 20,
      total: 0,
      items: [],
    });

    const controllerResponse = await controller.getTrendingCards(
      'week',
      'both',
      5,
      20,
    );
    const response = interceptor.responseHandler(
      controllerResponse,
      createContext(),
    );

    expect(response).toMatchObject({
      message: 'success',
      statusCode: 200,
      data: {
        period: 'week',
        direction: 'both',
        minChangePercent: 5,
        limit: 20,
        total: 0,
        items: [],
      },
    });
    expect(response.timestamp).toBeDefined();
    expect((response.data as Record<string, unknown>).status).toBeUndefined();
    expect((response.data as Record<string, unknown>).message).toBeUndefined();
    expect(
      (response.data as Record<string, unknown>).statusCode,
    ).toBeUndefined();
  });
});
