import { SpacedRepetitionData, ReviewItem } from '../types/progress';

export class SpacedRepetition {
    static applySM2(data: SpacedRepetitionData, reviewItem: ReviewItem, performanceRating: number): SpacedRepetitionData {
        const updatedReviewItems = data.reviewItems.map(item => {
            if (item.exerciseId === reviewItem.exerciseId) {
                const newInterval = 1 + (performanceRating * 0.5); // Simplified SM-2 algorithm
                return { ...item, reviewDate: new Date(Date.now() + newInterval * 86400000) }; // Adjust review date based on performance
            }
            return item;
        });
        return { reviewItems: updatedReviewItems };
    }
}