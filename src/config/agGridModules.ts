/**
 * AG Grid Module Registration
 * 
 * This file registers all AG Grid modules that are used in the application.
 * It should be imported at the top level of the application.
 */

import { ModuleRegistry } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';

// Register all enterprise modules (includes all community features)
ModuleRegistry.registerModules([AllEnterpriseModule]);

// Export a flag to indicate modules are registered
export const AG_GRID_MODULES_REGISTERED = true;