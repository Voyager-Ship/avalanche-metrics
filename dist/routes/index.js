"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const github_1 = require("../controllers/github");
const router = (0, express_1.Router)();
router.get('/user/:user/events', github_1.getUserEvents);
exports.default = router;
//# sourceMappingURL=index.js.map