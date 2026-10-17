// Browser-only exports for live verification; not part of the application bundle.
export { createRuntime } from '../src/providers/runtime.ts';
export { AllMenusMenuProvider } from '../src/providers/AllMenusMenuProvider.ts';
export { RecommendationEngine } from '../src/recommendation/RecommendationEngine.ts';
export { buildMeal } from '../src/recommendation/MealBuilder.ts';
export { emptyLearning } from '../src/recommendation/RecommendationScorer.ts';
export { parseLocation } from '../src/location/LocationParser.ts';
export { BrowserLocationService } from '../src/location/LocationService.ts';
export { assessIdentity } from '../src/menus/RestaurantMatcher.ts';
export { exactPrice } from '../src/providers/allmenus/parse.ts';
