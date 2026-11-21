import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RbacService } from '../common/rbac';
import { ReviewsService } from './reviews.service';

describe('ReviewsService testimonials', () => {
  const prisma = {
    review: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  let service: ReviewsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReviewsService(
      prisma as unknown as PrismaService,
      {} as RbacService,
    );
  });

  it('only queries approved and consented reviews for public testimonials', async () => {
    prisma.review.findMany.mockResolvedValue([
      {
        id: 'review-1',
        rating: 5,
        title: 'Excellent',
        comment: 'Exactly as described.',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        user: { firstName: 'Alyssa', lastName: 'Morgan' },
        product: { name: 'Coffee Maker' },
      },
    ]);

    const result = await service.findPublicTestimonials(6);

    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          testimonialConsent: true,
          testimonialStatus: 'APPROVED',
          comment: { not: null },
          rating: { not: null },
        },
        take: 6,
      }),
    );
    expect(result.data[0]).toMatchObject({
      name: 'Alyssa M.',
      productName: 'Coffee Maker',
    });
    expect(result.data[0]).not.toHaveProperty('user');
  });

  it('rejects moderation when consent has been withdrawn', async () => {
    prisma.review.findUnique.mockResolvedValue({
      id: 'review-1',
      testimonialConsent: false,
    });

    await expect(
      service.moderateTestimonial('review-1', true),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.review.update).not.toHaveBeenCalled();
  });

  it('returns an approved testimonial to pending when its content changes', async () => {
    prisma.review.findUnique.mockResolvedValue({
      id: 'review-1',
      userId: 'user-1',
      testimonialConsent: true,
      testimonialStatus: 'APPROVED',
    });
    prisma.review.update.mockResolvedValue({});

    await service.update(
      'review-1',
      { title: 'Updated review title' },
      { id: 'user-1', role: 'BUYER' },
    );

    expect(prisma.review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Updated review title',
          testimonialStatus: 'PENDING',
        }),
      }),
    );
  });
});
