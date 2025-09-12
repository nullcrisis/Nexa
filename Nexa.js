// ==UserScript==
// @name         Nexa
// @namespace    http://tampermonkey.net/
// @version      0.0.9
// @description  Automatically bypasses links
// @author       nullcrisis
// @updateURL    https://github.com/nullcrisis/Nexa/raw/refs/heads/main/Nexa.js
// @downloadURL  https://github.com/nullcrisis/Nexa/raw/refs/heads/main/Nexa.js
// @match        https://work.ink/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=work.ink
// @run-at       document-start
// @license      MIT
// ==/UserScript==
//
(function() {
    'use strict';
    //
    const DEBUG = false;
    //
    const OldLog   = unsafeWindow.console.log;
    const OldWarn  = unsafeWindow.console.warn;
    const OldError = unsafeWindow.console.error;
    //
    function Log(...Args)   { if (DEBUG) OldLog('[Nexa]', ...Args); }
    function Warn(...Args)  { if (DEBUG) OldWarn('[Nexa]', ...Args); }
    function Error(...Args) { if (DEBUG) OldError('[Nexa]', ...Args); }
    //
    if (DEBUG) unsafeWindow.console.clear = function() {};
    //
    Log('Solve Captcha 2 Continue');
    //
    const Mapping = {
        Send: ['sendMessage', 'sendMsg', 'writeMessage', 'writeMsg'],
        Info: ['onLinkInfo'],
        Dest: ['onLinkDestination'],
    };
    //
    function Resolve(Obj, Candidates) {
        for (let i = 0; i < Candidates.length; i++) {
            const Name = Candidates[i];
            if (typeof Obj[Name] === 'function') {
                return { Fn: Obj[Name], Index: i, Name };
            }
        }
        return { Fn: null, Index: -1, Name: null };
    }
    //
	let _sessionController,
		_sendMessage,
		_onLinkInfo,
		_onLinkDestination = undefined;
    //
    function Client() {
        return {
            ANNOUNCE:               'c_announce',
            MONETIZATION:           'c_monetization',
            SOCIAL_STARTED:         'c_social_started',
            RECAPTCHA_RESPONSE:     'c_recaptcha_response',
            HCAPTCHA_RESPONSE:      'c_hcaptcha_response',
            TURNSTILE_RESPONSE:     'c_turnstile_response',
            ADBLOCKER_DETECTED:     'c_adblocker_detected',
            FOCUS_LOST:             'c_focus_lost',
            OFFERS_SKIPPED:         'c_offers_skipped',
            FOCUS:                  'c_focus',
            WORKINK_PASS_AVAILABLE: 'c_workink_pass_available',
            WORKINK_PASS_USE:       'c_workink_pass_use',
            PING:                   'c_ping',
        };
    }
    //
    function SendProxy() {
        const Packets = Client();
        return function(...Args) {
            const Type = Args[0];
            const Data = Args[1];
            //
           	if (Type !== Packets.PING) {
				Log("Sent:", Type, Data);
			}
            //
            if (Type === Packets.ADBLOCKER_DETECTED) {
                Warn('Adblocker Blocked');
                return;
            }
            //
            if (_sessionController && _sessionController.linkInfo && Type === Packets.TURNSTILE_RESPONSE) {
                const Result = _sendMessage.apply(this, Args);
                //
                Log('Captcha Solved');
                //
                for (const social of _sessionController.linkInfo.socials) {
                    _sendMessage.call(this, Packets.SOCIAL_STARTED, { url: social.url });
                }
                //
                for (const monetizationIdx in _sessionController.linkInfo.monetizations) {
                    const monetization = _sessionController.linkInfo.monetizations[monetizationIdx];
                    //
                    switch (monetization) {
                        case 22:
                            _sendMessage.call(this, Packets.MONETIZATION, {
                                type: "readArticles2",
                                payload: { event: "read" },
                            });
                            break;
                        //
                        case 25:
                            _sendMessage.call(this, Packets.MONETIZATION, {
                                type: "operaGX",
                                payload: { event: "start" },
                            });
                            _sendMessage.call(this, Packets.MONETIZATION, {
                                type: "operaGX",
                                payload: { event: "installClicked" },
                            });
                            fetch('https://work.ink/_api/v2/callback/operaGX', {
                                method: 'POST',
                                mode: 'no-cors',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    'noteligible': true
                                })
                            });
                            break;
                        //
                        case 34:
                            _sendMessage.call(this, Packets.MONETIZATION, {
                                type: "norton",
                                payload: { event: "start" },
                            });
                            _sendMessage.call(this, Packets.MONETIZATION, {
                                type: "norton",
                                payload: { event: "installClicked" },
                            });
                            break;
                        //
                        case 71:
                            _sendMessage.call(this, Packets.MONETIZATION, {
                                type: "externalArticles",
                                payload: { event: "start" },
                            });
                            _sendMessage.call(this, Packets.MONETIZATION, {
                                type: "externalArticles",
                                payload: { event: "installClicked" },
                            });
                            break;
                        //
                        case 45:
                            _sendMessage.call(this, Packets.MONETIZATION, {
                                type: "pdfeditor",
                                payload: { event: "installed" },
                            });
                            break;
                        //
                        case 43:
                            _sendMessage.call(this, Packets.MONETIZATION, {
                                type: "temuMobile",
                                payload: { event: "installClicked" },
                            });
                            break;
                        //
                        case 57:
                            _sendMessage.call(this, Packets.MONETIZATION, {
                                type: "betterdeals",
                                payload: { event: "installed" },
                            });
                            break;
                        //
                        default:
                            Log("Unknown Monetization:", typeof monetization, monetization);
                            break;
                    }
                }
                return Result;
            }
            //
            return _sendMessage.apply(this, Args);
        };
    }
    //
    function InfoProxy() {
        return function(...Args) {
            const Link = Args[0];
            //
            Log('Link Info:', Link);
            //
            Object.defineProperty(Link, 'IsAdblockEnabled', {
                get() { return false; },
                set(NewValue) { Log('Attempt Set IsAdblock:', NewValue); },
                configurable: false,
                enumerable: true,
            });
            //
            return _onLinkInfo.apply(this, Args);
        };
    }
    //
    function DestProxy() {
        return function(...Args) {
            const Payload = Args[0];
            //
            Log('Link Dest:', Payload);
            window.location.href = Payload.url;
            //
            return _onLinkDestination.apply(this, Args);
        };
    }
    //
    function Session() {
        const Send = Resolve(_sessionController, Mapping.Send);
        const Info = Resolve(_sessionController, Mapping.Info);
        const Dest = Resolve(_sessionController, Mapping.Dest);
        //
        _sendMessage       = Send.Fn;
        _onLinkInfo        = Info.Fn;
        _onLinkDestination = Dest.Fn;
        //
        const SendProxyObj = SendProxy();
        const InfoProxyObj = InfoProxy();
        const DestProxyObj = DestProxy();
        //
        Object.defineProperty(_sessionController, Send.Name, {
            get() { return SendProxyObj; },
            set(NewValue) { _sendMessage = NewValue; },
            configurable: false,
            enumerable: true,
        });
        //
        Object.defineProperty(_sessionController, Info.Name, {
            get() { return InfoProxyObj; },
            set(NewValue) { _onLinkInfo = NewValue; },
            configurable: false,
            enumerable: true,
        });
        //
        Object.defineProperty(_sessionController, Dest.Name, {
            get() { return DestProxyObj; },
            set(NewValue) { _onLinkDestination = NewValue; },
            configurable: false,
            enumerable: true,
        });
        //
        Log(`Session Proxies: ${Send.Name}, ${Info.Name}, ${Dest.Name}`);
    }
    //
    function Check(Object, Property, Value, Receiver) {
        Log('Check:', Property, Value);
        //
        if (
            Value &&
            typeof Value === 'object' &&
            Resolve(Value, Mapping.Send).Fn &&
            Resolve(Value, Mapping.Info).Fn &&
            Resolve(Value, Mapping.Dest).Fn &&
            !_sessionController
        ) {
            _sessionController = Value;
            Log('Intercepted Session:', _sessionController);
            Session();
        }
        //
        return Reflect.set(Object, Property, Value, Receiver);
    }
    //
    function CompProxy(Component) {
        return new Proxy(Component, {
            construct(Target, Args) {
                const Result = Reflect.construct(Target, Args);
                Log('Component:', Target, Args, Result);
                Result.$$.ctx = new Proxy(Result.$$.ctx, { set: Check });
                return Result;
            },
        });
    }
    //
    function NodeProxy(Result) {
        return new Proxy(Result, {
            get(Target, Property, Receiver) {
                if (Property === 'component') return CompProxy(Target.component);
                return Reflect.get(Target, Property, Receiver);
            },
        });
    }
    //
    function AsyncNode(Node) {
        return async(...Args) => {
            const Result = await Node(...Args);
            Log('Node:', Result);
            return NodeProxy(Result);
        };
    }
    //
    function KitProxy(Kit) {
        if (typeof Kit !== 'object' || !Kit) return [false, Kit];
        //
        const Start = 'start' in Kit && Kit.start;
        if (!Start) return [false, Kit];
        //
        const ProxyKit = new Proxy(Kit, {
            get(Target, Property, Receiver) {
                if (Property === 'start') {
                    return function(...Args) {
                        const Module  = Args[0];
                        const Options = Args[2];
                        //
                        if (
                            typeof Module === 'object' &&
                            typeof Module.nodes === 'object' &&
                            typeof Options === 'object' &&
                            typeof Options.node_ids === 'object'
                        ) {
                            const Node = Module.nodes[Options.node_ids[1]];
                            Module.nodes[Options.node_ids[1]] = AsyncNode(Node);
                        }
                        //
                        Log('Kit.Start Hooked', Options);
                        return Start.apply(this, Args);
                    };
                }
                return Reflect.get(Target, Property, Receiver);
            },
        });
        return [true, ProxyKit];
    }
    //
    function KitSetup() {
        const OriginalPromiseAll = unsafeWindow.Promise.all;
        let Intercepted = false;
        //
        unsafeWindow.Promise.all = async function(Promises) {
            const Result = OriginalPromiseAll.call(this, Promises);
            //
            if (!Intercepted) {
                Intercepted = true;
                return await new Promise((Resolve) => {
                    Result.then(([Kit, App, ...Args]) => {
                        Log('Modules Loaded');
                        const [Success, WrappedKit] = KitProxy(Kit);
                        if (Success) {
                            unsafeWindow.Promise.all = OriginalPromiseAll;
                            Log('Wrapped Kit:', WrappedKit, App);
                        }
                        Resolve([WrappedKit, App, ...Args]);
                    });
                });
            }
            return await Result;
        };
    }
    //
    KitSetup();
    //
    const Observer = new MutationObserver((Mutations) => {
        for (const Mutation of Mutations) {
            for (const Node of Mutation.addedNodes) {
                if (Node.nodeType === 1) {
                    if (Node.classList?.contains('adsbygoogle')) {
                        Node.remove();
                        Log('Removed Ad:', Node);
                    }
                    Node.querySelectorAll?.('.adsbygoogle').forEach((Element) => {
                        Element.remove();
                        Log('Removed Nested Ad:', Element);
                    });
                }
            }
        }
    });
    //
    Observer.observe(unsafeWindow.document.documentElement, {
        childList: true,
        subtree: true,
    });
})();
