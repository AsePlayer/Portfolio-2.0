// Test-only entry: runs the actual App with an explicitly supplied source menu.
import '../src/styles/main.css';
import '../src/styles/views.css';
export { App } from '../src/ui/App.ts';
export { LocalDatabase } from '../src/storage/LocalDatabase.ts';
export { RecommendationEngine } from '../src/recommendation/RecommendationEngine.ts';
export { BrowserLocationService } from '../src/location/LocationService.ts';
export { seededRandom } from '../src/recommendation/random.ts';
export { AllMenusMenuProvider } from '../src/providers/AllMenusMenuProvider.ts';
export { buildMeal, mealCandidates } from '../src/recommendation/MealBuilder.ts';
