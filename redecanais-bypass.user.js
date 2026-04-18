// ==UserScript==
// @name         RedeCanais Ad Bypass
// @name:pt-BR   RedeCanais Ad Bypass
// @name:en      RedeCanais Ad Bypass
// @namespace    https://github.com/japbcoelho
// @version      1.1
// @description  Remove o ad-gate (popup que obriga clicar em anúncios para assistir), bloqueia popunders, remove overlays de propaganda e desativa o bloqueio de DevTools no RedeCanais.
// @description:en  Removes the ad-gate (popup forcing ad clicks to watch videos), blocks popunders, removes ad overlays and disables DevTools blocking on RedeCanais.
// @author       Kanin
// @license      MIT
// @match        *://redecanais.ooo/*
// @match        *://redecanais.cafe/*
// @match        *://redecanais.gs/*
// @match        *://redecanais.ms/*
// @match        *://redecanais.ps/*
// @match        *://redecanais.zip/*
// @match        *://redecanais.africa/*
// @match        *://redecanais.mov/*
// @match        *://redecanais.la/*
// @match        *://redecanais.dev/*
// @match        *://redecanais.ac/*
// @match        *://redecanais.dad/*
// @match        *://redecanais.in/*
// @match        *://redecanais.be/*
// @match        *://redecanais.ph/*
// @grant        none
// @run-at       document-start
// @noframes     false
// ==/UserScript==

(function() {
    'use strict';

    const TAG = '[RC-Bypass v1]';
    const FUTURE = Date.now() + 86400000;

    // ===================================================================
    // 1. LOCALSTORAGE - intercepta chaves de controle de anúncios
    //    LOCALSTORAGE - intercepts ad-control storage keys
    // ===================================================================
    const _getItem = localStorage.getItem.bind(localStorage);
    const _setItem = localStorage.setItem.bind(localStorage);

    // Padrão para chaves do RedeCanais (prefixo rc, snooze, ad ou vip)
    // Pattern for RedeCanais keys (rc prefix, snooze, ad or vip)
    const SNOOZE_PATTERN = /^rc|snooze|^ad[A-Z_]|^vip/i;

    localStorage.getItem = function(key) {
        // Retorna timestamp futuro para chaves de snooze/ad
        // Returns a future timestamp for snooze/ad keys
        if (typeof key === 'string' && SNOOZE_PATTERN.test(key)) {
            return FUTURE.toString();
        }
        return _getItem(key);
    };

    // Quando o site lê data-snooze-key do DOM, já seta o valor
    // When the site reads data-snooze-key from the DOM, pre-sets the value
    const _getAttribute = Element.prototype.getAttribute;
    Element.prototype.getAttribute = function(name) {
        const val = _getAttribute.call(this, name);
        if (name === 'data-snooze-key' && val) {
            _setItem(val, FUTURE.toString());
        }
        return val;
    };

    // ===================================================================
    // 2. WINDOW.OPEN - bloqueia popunders, permite links legítimos
    //    WINDOW.OPEN - blocks popunders, allows legitimate links
    // ===================================================================
    const _open = window.open.bind(window);

    window.open = function(url, target, features) {
        const urlStr = String(url || '');

        // Permite links internos do RedeCanais e caminhos relativos
        // Allows internal RedeCanais links and relative paths
        if (urlStr.includes('redecanais') || urlStr.startsWith('/')) {
            return _open(url, target, features);
        }

        // Tudo que não é interno: bloqueia (o site abre URLs de ad variadas)
        // Everything non-internal: block (the site opens various ad URLs)
        console.log(TAG, 'Popunder bloqueado:', urlStr.substring(0, 80));
        return makeFakeWindow(urlStr);
    };

    // Cria um objeto falso que simula uma janela aberta
    // Creates a fake object that simulates an opened window
    function makeFakeWindow(url) {
        const fakeWin = {
            closed: false,
            close() { this.closed = true; },
            location: { href: url || '' },
            document: { title: '' },
            focus() {},
            blur() {},
            postMessage() {},
            opener: window
        };
        // Simula fechamento após 3s (faz o site pensar que o ad foi visitado)
        // Simulates closing after 3s (makes the site think the ad was visited)
        setTimeout(() => { fakeWin.closed = true; }, 3000);
        return fakeWin;
    }

    // ===================================================================
    // 3. SWEETALERT2 - auto-confirma popups de anúncio (ad-gate)
    //    SWEETALERT2 - auto-confirms ad popups (ad-gate)
    // ===================================================================

    // Padrão para identificar popups de anúncio pelo texto
    // Pattern to identify ad popups by their text content
    const AD_POPUP_PATTERN = /desbloqueie|acesso\s*vip|abrir.*an[uú]ncio|concluiu.*an[uú]ncio|restam.*an[uú]ncio|clique.*an[uú]ncio|remover\s*anuncio/i;

    // Verifica se o config do Swal.fire é um popup de anúncio
    // Checks whether the Swal.fire config is an ad popup
    function isAdPopup(config) {
        if (!config) return false;
        const text = [
            typeof config === 'string' ? config : '',
            typeof config.html === 'string' ? config.html : '',
            typeof config.text === 'string' ? config.text : '',
            typeof config.title === 'string' ? config.title : ''
        ].join(' ');
        return AD_POPUP_PATTERN.test(text);
    }

    // Substitui Swal.fire: popups de ad são auto-confirmados, os demais passam
    // Replaces Swal.fire: ad popups are auto-confirmed, others pass through
    function patchSwal(swal) {
        if (!swal || swal._rcPatched) return;
        swal._rcPatched = true;

        const origFire = swal.fire.bind(swal);

        swal.fire = function(...args) {
            const config = args[0] || {};

            if (isAdPopup(config)) {
                console.log(TAG, 'Ad-gate popup bloqueado');
                return Promise.resolve({
                    isConfirmed: true,
                    isDenied: false,
                    isDismissed: false,
                    value: true
                });
            }

            // Popups legítimos passam normalmente
            // Legitimate popups pass through normally
            return origFire(...args);
        };

        const origClose = swal.close?.bind(swal);
        swal.close = function() {
            try { origClose?.(); } catch(e) {}
            cleanupAdPopup();
        };

        console.log(TAG, 'SweetAlert2 patcheado');
    }

    // Intercepta definição de Swal no window
    // Intercepts Swal definition on window
    let _swalValue;
    try {
        Object.defineProperty(window, 'Swal', {
            get() { return _swalValue; },
            set(val) {
                _swalValue = val;
                if (val && val.fire) patchSwal(val);
            },
            configurable: true,
            enumerable: true
        });
    } catch(e) {
        // Fallback: polling periódico
        // Fallback: periodic polling
        const checkSwal = setInterval(() => {
            if (window.Swal && window.Swal.fire && !window.Swal._rcPatched) {
                patchSwal(window.Swal);
                clearInterval(checkSwal);
            }
        }, 100);
        setTimeout(() => clearInterval(checkSwal), 30000);
    }

    // ===================================================================
    // 4. DISABLE-DEVTOOL BYPASS - desativa bloqueio do F12/DevTools
    //    DISABLE-DEVTOOL BYPASS - disables F12/DevTools blocking
    // ===================================================================

    // O site usa a lib "disable-devtool" (theajack.github.io/disable-devtool)
    // que redireciona para uma página 404 quando DevTools é aberto.
    // The site uses "disable-devtool" lib (theajack.github.io/disable-devtool)
    // which redirects to a 404 page when DevTools is opened.

    // Bloqueia o script de ser carregado
    // Blocks the script from being loaded
    const _appendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function(child) {
        if (child.tagName === 'SCRIPT' && child.src &&
            (child.src.includes('disable-devtool') || child.src.includes('disable_devtool'))) {
            console.log(TAG, 'disable-devtool bloqueado');
            return child;
        }
        return _appendChild.call(this, child);
    };

    // Neutraliza o objeto DisableDevtool se já estiver no window
    // Neutralizes the DisableDevtool object if already on window
    try {
        Object.defineProperty(window, 'DisableDevtool', {
            get() { return function() {}; },
            set() {},
            configurable: true
        });
    } catch(e) {}

    // Impede redirecionamento para a página 404 do disable-devtool
    // Prevents redirect to the disable-devtool 404 page
    const _replaceState = history.replaceState?.bind(history);
    if (_replaceState) {
        history.replaceState = function(state, title, url) {
            if (typeof url === 'string' && url.includes('disable-devtool')) {
                console.log(TAG, 'Redirect do disable-devtool bloqueado');
                return;
            }
            return _replaceState(state, title, url);
        };
    }

    // ===================================================================
    // 5. REDIRECT PROTECTION - bloqueia redirecionamentos de anúncios
    //    REDIRECT PROTECTION - blocks ad redirects
    // ===================================================================

    // Intercepta location.href/replace usados por scripts de ad para redirecionar
    // Intercepts location.href/replace used by ad scripts to redirect
    const _locationReplace = window.location.replace?.bind(window.location);
    if (_locationReplace) {
        window.location.replace = function(url) {
            const urlStr = String(url || '');
            if (urlStr.includes('redecanais') || urlStr.startsWith('/')) {
                return _locationReplace(url);
            }
            console.log(TAG, 'Redirect bloqueado:', urlStr.substring(0, 80));
        };
    }

    // ===================================================================
    // 6. OVERLAY REMOVAL - remove overlays de propaganda sobre o player
    //    OVERLAY REMOVAL - removes ad overlays on top of the video player
    // ===================================================================
    function cleanupAdPopup() {
        // Remove classes do SweetAlert que bloqueiam scroll
        // Removes SweetAlert classes that block scrolling
        document.documentElement?.classList.remove('swal2-shown', 'swal2-height-auto');
        document.body?.classList.remove('swal2-shown', 'swal2-height-auto');
        if (document.body) {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }

        // Remove containers de ad do SweetAlert (preserva os legítimos)
        // Removes SweetAlert ad containers (preserves legitimate ones)
        document.querySelectorAll('.swal2-container').forEach(el => {
            const text = el.textContent || '';
            if (AD_POPUP_PATTERN.test(text)) {
                el.remove();
            }
        });

        // Mostra iframes de vídeo escondidos
        // Shows hidden video iframes
        document.querySelectorAll('iframe').forEach(iframe => {
            if (iframe.style.display === 'none') {
                iframe.style.display = 'block';
            }
            iframe.style.visibility = 'visible';
        });

        // Esconde overlay de reopen
        // Hides the reopen overlay
        document.querySelectorAll('[class*="reopen"], [id*="reopen"]').forEach(el => {
            el.hidden = true;
        });

        // Remove overlays de propaganda com z-index absurdo
        // Removes ad overlays with absurdly high z-index
        document.querySelectorAll('div[style*="z-index"]').forEach(el => {
            const z = parseInt(window.getComputedStyle(el).zIndex || '0');
            if (z >= 2147483640) {
                const text = el.textContent || '';
                // Preserva o swal2 container (tratado acima) e elementos do player
                // Preserves swal2 container (handled above) and player elements
                if (!el.classList?.contains('swal2-container') &&
                    !el.querySelector?.('video') &&
                    !el.id?.includes('player')) {
                    el.style.display = 'none';
                    console.log(TAG, 'Overlay de alta prioridade removido');
                }
            }
        });
    }

    // ===================================================================
    // 7. MUTATION OBSERVER - reage a novos elementos no DOM
    //    MUTATION OBSERVER - reacts to new elements added to the DOM
    // ===================================================================
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;

                // SweetAlert container adicionado → limpa
                // SweetAlert container added → clean up
                if (node.classList?.contains('swal2-container') ||
                    node.querySelector?.('.swal2-container')) {
                    setTimeout(cleanupAdPopup, 10);
                    setTimeout(cleanupAdPopup, 200);
                }

                // Script do SweetAlert carregado → re-aplica patch
                // SweetAlert script loaded → re-apply patch
                if (node.tagName === 'SCRIPT' && node.src?.includes('sweetalert')) {
                    node.addEventListener('load', () => {
                        if (window.Swal && !window.Swal._rcPatched) {
                            patchSwal(window.Swal);
                        }
                    });
                }
            }
        }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    // ===================================================================
    // 8. EXECUÇÃO - roda cleanup em múltiplos momentos do carregamento
    //    EXECUTION - runs cleanup at multiple loading stages
    // ===================================================================
    document.addEventListener('DOMContentLoaded', () => {
        cleanupAdPopup();
        setTimeout(cleanupAdPopup, 500);
        setTimeout(cleanupAdPopup, 1500);
        setTimeout(cleanupAdPopup, 3000);
        setTimeout(cleanupAdPopup, 5000);

        if (window.Swal && !window.Swal._rcPatched) {
            patchSwal(window.Swal);
        }
    });

    window.addEventListener('load', () => {
        cleanupAdPopup();
        setTimeout(cleanupAdPopup, 1000);

        if (window.Swal && !window.Swal._rcPatched) {
            patchSwal(window.Swal);
        }
    });

    // Cleanup periódico - para após 30s
    // Periodic cleanup - stops after 30s
    let cleanupCount = 0;
    const cleanupInterval = setInterval(() => {
        cleanupAdPopup();
        cleanupCount++;
        if (cleanupCount >= 15) clearInterval(cleanupInterval);
    }, 2000);

    console.log(TAG, 'Carregado');
})();
