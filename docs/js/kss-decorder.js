/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ var __webpack_modules__ = ({

/***/ "./src/kss-decoder-worker.ts":
/*!***********************************!*\
  !*** ./src/kss-decoder-worker.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var libkss_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! libkss-js */ \"./node_modules/libkss-js/src/index.js\");\n/* harmony import */ var libkss_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(libkss_js__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var webaudio_stream_player__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! webaudio-stream-player */ \"./node_modules/webaudio-stream-player/dist/index.js\");\nvar __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\n    return new (P || (P = Promise))(function (resolve, reject) {\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\n        function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\n    });\n};\n\n\nclass KSSDecoderWorker extends webaudio_stream_player__WEBPACK_IMPORTED_MODULE_1__.AudioDecoderWorker {\n    constructor(worker) {\n        super(worker);\n        this._kss = null;\n        this._kssplay = null;\n        this._maxDuration = 60 * 1000 * 5;\n        this._fadeDuration = 5 * 1000;\n        this._decodeFrames = 0;\n    }\n    init(args) {\n        return __awaiter(this, void 0, void 0, function* () {\n            yield libkss_js__WEBPACK_IMPORTED_MODULE_0__.KSSPlay.initialize();\n            console.log('KSSPlay.initialized');\n        });\n    }\n    start(args) {\n        var _a, _b, _c, _d, _e;\n        return __awaiter(this, void 0, void 0, function* () {\n            const options = args;\n            let data;\n            if (options.data instanceof Uint8Array) {\n                data = options.data;\n            }\n            else {\n                data = new Uint8Array(options.data);\n            }\n            this._kss = new libkss_js__WEBPACK_IMPORTED_MODULE_0__.KSS(data, (_a = options.label) !== null && _a !== void 0 ? _a : \"\");\n            if (this._kssplay == null) {\n                this._kssplay = new libkss_js__WEBPACK_IMPORTED_MODULE_0__.KSSPlay(this.sampleRate);\n            }\n            this._kssplay.setData(this._kss);\n            this._kssplay.setDeviceQuality({ psg: 1, opll: 1, scc: 0, opl: 1 });\n            this._kssplay.reset((_b = options.song) !== null && _b !== void 0 ? _b : 0, (_c = options.cpu) !== null && _c !== void 0 ? _c : 0);\n            this._fadeDuration = (_d = options.fadeDuration) !== null && _d !== void 0 ? _d : this._fadeDuration;\n            this._maxDuration = (_e = options.duration) !== null && _e !== void 0 ? _e : this._maxDuration;\n            this._decodeFrames = 0;\n        });\n    }\n    process() {\n        var _a, _b, _c, _d, _e;\n        return __awaiter(this, void 0, void 0, function* () {\n            if (((_a = this._kssplay) === null || _a === void 0 ? void 0 : _a.getFadeFlag()) == 2 || ((_b = this._kssplay) === null || _b === void 0 ? void 0 : _b.getStopFlag()) != 0) {\n                return null;\n            }\n            const time = this._decodeFrames / this.sampleRate / 1000;\n            if (((_c = this._kssplay) === null || _c === void 0 ? void 0 : _c.getLoopCount()) >= 2 || this._maxDuration - this._fadeDuration < time) {\n                if (((_d = this._kssplay) === null || _d === void 0 ? void 0 : _d.getFadeFlag()) == 0) {\n                    (_e = this._kssplay) === null || _e === void 0 ? void 0 : _e.fadeStart(this._fadeDuration);\n                }\n            }\n            if (this._maxDuration < time) {\n                return null;\n            }\n            return [this._kssplay.calc(this.sampleRate)];\n        });\n    }\n    abort() {\n        var _a;\n        return __awaiter(this, void 0, void 0, function* () {\n            (_a = this._kss) === null || _a === void 0 ? void 0 : _a.release();\n            this._kss = null;\n        });\n    }\n    dispose() {\n        var _a, _b;\n        return __awaiter(this, void 0, void 0, function* () {\n            (_a = this._kssplay) === null || _a === void 0 ? void 0 : _a.release();\n            this._kssplay = null;\n            (_b = this._kss) === null || _b === void 0 ? void 0 : _b.release();\n            this._kss = null;\n        });\n    }\n}\n/* `self as any` is workaround. See: [issue#20595](https://github.com/microsoft/TypeScript/issues/20595) */\nconst worker = self;\nconst decoder = new KSSDecoderWorker(worker);\n\n\n//# sourceURL=webpack://kss-worklet/./src/kss-decoder-worker.ts?");

/***/ }),

/***/ "?79f4":
/*!********************!*\
  !*** fs (ignored) ***!
  \********************/
/***/ (() => {

eval("/* (ignored) */\n\n//# sourceURL=webpack://kss-worklet/fs_(ignored)?");

/***/ }),

/***/ "?466b":
/*!**********************!*\
  !*** path (ignored) ***!
  \**********************/
/***/ (() => {

eval("/* (ignored) */\n\n//# sourceURL=webpack://kss-worklet/path_(ignored)?");

/***/ })

/******/ });
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __webpack_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	var module = __webpack_module_cache__[moduleId] = {
/******/ 		// no module.id needed
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/******/ // expose the modules object (__webpack_modules__)
/******/ __webpack_require__.m = __webpack_modules__;
/******/ 
/******/ // the startup function
/******/ __webpack_require__.x = () => {
/******/ 	// Load entry module and return exports
/******/ 	// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 	var __webpack_exports__ = __webpack_require__.O(undefined, ["vendors-node_modules_libkss-js_src_index_js-node_modules_webaudio-stream-player_dist_index_js"], () => (__webpack_require__("./src/kss-decoder-worker.ts")))
/******/ 	__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 	return __webpack_exports__;
/******/ };
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/amd options */
/******/ (() => {
/******/ 	__webpack_require__.amdO = {};
/******/ })();
/******/ 
/******/ /* webpack/runtime/chunk loaded */
/******/ (() => {
/******/ 	var deferred = [];
/******/ 	__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 		if(chunkIds) {
/******/ 			priority = priority || 0;
/******/ 			for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 			deferred[i] = [chunkIds, fn, priority];
/******/ 			return;
/******/ 		}
/******/ 		var notFulfilled = Infinity;
/******/ 		for (var i = 0; i < deferred.length; i++) {
/******/ 			var [chunkIds, fn, priority] = deferred[i];
/******/ 			var fulfilled = true;
/******/ 			for (var j = 0; j < chunkIds.length; j++) {
/******/ 				if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 					chunkIds.splice(j--, 1);
/******/ 				} else {
/******/ 					fulfilled = false;
/******/ 					if(priority < notFulfilled) notFulfilled = priority;
/******/ 				}
/******/ 			}
/******/ 			if(fulfilled) {
/******/ 				deferred.splice(i--, 1)
/******/ 				var r = fn();
/******/ 				if (r !== undefined) result = r;
/******/ 			}
/******/ 		}
/******/ 		return result;
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/compat get default export */
/******/ (() => {
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = (module) => {
/******/ 		var getter = module && module.__esModule ?
/******/ 			() => (module['default']) :
/******/ 			() => (module);
/******/ 		__webpack_require__.d(getter, { a: getter });
/******/ 		return getter;
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/ensure chunk */
/******/ (() => {
/******/ 	__webpack_require__.f = {};
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = (chunkId) => {
/******/ 		return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 			__webpack_require__.f[key](chunkId, promises);
/******/ 			return promises;
/******/ 		}, []));
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/get javascript chunk filename */
/******/ (() => {
/******/ 	// This function allow to reference async chunks and sibling chunks for the entrypoint
/******/ 	__webpack_require__.u = (chunkId) => {
/******/ 		// return url for filenames based on template
/******/ 		return "" + chunkId + ".js";
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/global */
/******/ (() => {
/******/ 	__webpack_require__.g = (function() {
/******/ 		if (typeof globalThis === 'object') return globalThis;
/******/ 		try {
/******/ 			return this || new Function('return this')();
/******/ 		} catch (e) {
/******/ 			if (typeof window === 'object') return window;
/******/ 		}
/******/ 	})();
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/make namespace object */
/******/ (() => {
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = (exports) => {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/publicPath */
/******/ (() => {
/******/ 	__webpack_require__.p = "/js/";
/******/ })();
/******/ 
/******/ /* webpack/runtime/importScripts chunk loading */
/******/ (() => {
/******/ 	// no baseURI
/******/ 	
/******/ 	// object to store loaded chunks
/******/ 	// "1" means "already loaded"
/******/ 	var installedChunks = {
/******/ 		"kss-decorder": 1
/******/ 	};
/******/ 	
/******/ 	// importScripts chunk loading
/******/ 	var installChunk = (data) => {
/******/ 		var [chunkIds, moreModules, runtime] = data;
/******/ 		for(var moduleId in moreModules) {
/******/ 			if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 				__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(runtime) runtime(__webpack_require__);
/******/ 		while(chunkIds.length)
/******/ 			installedChunks[chunkIds.pop()] = 1;
/******/ 		parentChunkLoadingFunction(data);
/******/ 	};
/******/ 	__webpack_require__.f.i = (chunkId, promises) => {
/******/ 		// "1" is the signal for "already loaded"
/******/ 		if(!installedChunks[chunkId]) {
/******/ 			if(true) { // all chunks have JS
/******/ 				importScripts(__webpack_require__.p + __webpack_require__.u(chunkId));
/******/ 			}
/******/ 		}
/******/ 	};
/******/ 	
/******/ 	var chunkLoadingGlobal = self["webpackChunkkss_worklet"] = self["webpackChunkkss_worklet"] || [];
/******/ 	var parentChunkLoadingFunction = chunkLoadingGlobal.push.bind(chunkLoadingGlobal);
/******/ 	chunkLoadingGlobal.push = installChunk;
/******/ 	
/******/ 	// no HMR
/******/ 	
/******/ 	// no HMR manifest
/******/ })();
/******/ 
/******/ /* webpack/runtime/startup chunk dependencies */
/******/ (() => {
/******/ 	var next = __webpack_require__.x;
/******/ 	__webpack_require__.x = () => {
/******/ 		return __webpack_require__.e("vendors-node_modules_libkss-js_src_index_js-node_modules_webaudio-stream-player_dist_index_js").then(next);
/******/ 	};
/******/ })();
/******/ 
/************************************************************************/
/******/ 
/******/ // run startup
/******/ var __webpack_exports__ = __webpack_require__.x();
/******/ 
