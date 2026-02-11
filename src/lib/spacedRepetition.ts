import { SpacedRepetitionData, ReviewItem } from '../types/progress';

/**
 * SM-2 Spaced Repetition Algorithm Implementation
 * Based on the SuperMemo 2 algorithm by Piotr Wozniak
 */
export class SpacedRepetition {
  /**
   * Apply SM-2 algorithm to update review schedule
   * @param data Current spaced repetition data
   * @param exerciseId The exercise being reviewed
   * @param performanceRating Quality of response (0-5)
   *   0 - Complete blackout
   *   1 - Incorrect, but remembered upon seeing answer
   *   2 - Incorrect, but easy to recall
   *   3 - Correct with serious difficulty
   *   4 - Correct with some hesitation
   *   5 - Perfect response
   */
  static applySM2(
    data: SpacedRepetitionData, 
    exerciseId: string, 
    performanceRating: number
  ): SpacedRepetitionData {
    const existingItem = data.items[exerciseId];
    
    // Default values for new items
    let easeFactor = existingItem?.easeFactor ?? 2.5;
    let interval = existingItem?.interval ?? 1;
    let repetitions = existingItem?.repetitions ?? 0;
    
    // SM-2 algorithm
    if (performanceRating >= 3) {
      // Correct response
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
    } else {
      // Incorrect response - reset
      repetitions = 0;
      interval = 1;
    }
    
    // Update ease factor
    easeFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - performanceRating) * (0.08 + (5 - performanceRating) * 0.02))
    );
    
    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);
    
    const updatedItem: ReviewItem = {
      exerciseId,
      easeFactor,
      interval,
      nextReview,
      repetitions,
    };
    
    return {
      items: {
        ...data.items,
        [exerciseId]: updatedItem,
      },
      lastReviewDate: new Date(),
    };
  }
  
  /**
   * Get items due for review
   */
  static getDueItems(data: SpacedRepetitionData): ReviewItem[] {
    const now = new Date();
    return Object.values(data.items).filter(
      item => new Date(item.nextReview) <= now
    );
  }
  
  /**
   * Initialize empty spaced repetition data
   */
  static createInitialData(): SpacedRepetitionData {
    return {
      items: {},
      lastReviewDate: null,
    };
  }
}
