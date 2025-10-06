"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const analysis_1 = require("../src/api/analysis");
jest.setTimeout(10000);
if (!global.__ANALYSIS_SYSTEM_INITIALIZED__) {
    (0, analysis_1.initializeAnalysisSystem)();
    global.__ANALYSIS_SYSTEM_INITIALIZED__ = true;
}
global.testUtils = {};
//# sourceMappingURL=setup.js.map