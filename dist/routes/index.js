"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const github_1 = require("../controllers/github");
const router = (0, express_1.Router)();
router.get('/users/contributions', github_1.getUsersContributions);
exports.default = router;
//# sourceMappingURL=index.js.map