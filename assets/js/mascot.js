/* Maskot "Tido": bocah chibi ngantuk berpiyama + topi tidur (karakter asli untuk situs ini).
   Dimuat oleh chat widget (ewoks-core.js). Semua gambar SVG + animasi CSS, tanpa suara.
   Scene FAB: sit (peluk bantal, ngantuk), sleep (tiduran peluk guling), car (main mobil-mobilan), fly (terbang naik bantal).
   Peek: nongol/glayutan di tepi atas kotak chat. */
(function () {
    'use strict';
    if (window.EwoksMascot) return;
    var INK = '#3a2a52', SKIN = '#ffe3cf', HAIR = '#5b4a86', CAP = '#7c6cf0', CAP2 = '#a99bff', PJ = '#c4b5fd', CREAM = '#fff7e6', PINK = '#f9a8d4', EM = '#10b981', STAR = '#fde68a';
    var SW = 'stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';
    function star(x, y, s, f) { return '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0-4 l1.2 2.8 3 .3 -2.3 2 .7 3 -2.6-1.6 -2.6 1.6 .7-3 -2.3-2 3-.3z" fill="' + (f || STAR) + '"/>'; }
    function eye(sx) {
        return '<g><ellipse cx="' + sx + '" cy="5" rx="5.8" ry="7.2" fill="' + INK + '"/><circle cx="' + (sx + 1.7) + '" cy="2.4" r="2.2" fill="#fff"/><circle cx="' + (sx - 1.6) + '" cy="8" r="1.05" fill="#fff" opacity=".85"/></g>';
    }
    function lid(sx) {
        return '<g class="k-lid"><rect x="' + (sx - 8) + '" y="-5" width="16" height="19" fill="' + SKIN + '"/><path d="M' + (sx - 7.5) + ' 14 q7.5 3.2 15 0" fill="none" ' + SW + '/></g>';
    }
    /* kepala chibi, titik pusat (0,0). Dipakai ulang di semua scene. */
    function head(extra) {
        return '<g class="k-head' + (extra || '') + '">' +
            '<ellipse cx="0" cy="-1" rx="34" ry="31" fill="' + HAIR + '" ' + SW + '/>' +
            '<path d="M-30 14 q-3 12 3 18 q3-8 6-12z M30 14 q3 12-3 18 q-3-8-6-12z" fill="' + HAIR + '" ' + SW + '/>' +
            '<ellipse cx="0" cy="3" rx="29.5" ry="26" fill="' + SKIN + '" ' + SW + '/>' +
            '<ellipse cx="-19.5" cy="13" rx="5.8" ry="3.4" fill="#ff9fb5" opacity=".6"/><ellipse cx="19.5" cy="13" rx="5.8" ry="3.4" fill="#ff9fb5" opacity=".6"/>' +
            '<g class="k-eyes">' + eye(-12.5) + eye(12.5) + '</g>' + lid(-12.5) + lid(12.5) +
            '<path d="M-18 -4 q5.5-3.2 11 0.4 M7 -3.6 q5.5-3.6 11-0.4" fill="none" ' + SW + ' stroke-width="1.7"/>' +
            '<path class="k-mouth" d="M-3.5 17.5 q3.5 2.6 7 0" fill="none" ' + SW + ' stroke-width="1.9"/>' +
            '<ellipse class="k-yawn" cx="0" cy="18.5" rx="4.4" ry="5.4" fill="#ff7a93" ' + SW + ' stroke-width="1.8"/>' +
            '<path d="M-30 -3 Q-33 -30 0 -31.5 Q33 -30 30 -3 Q25 -15 17 -13.5 Q12 -5 5.5 -17 Q0 -7 -6 -17 Q-12 -6 -17.5 -14.5 Q-26 -13 -30 -3Z" fill="' + HAIR + '" ' + SW + '/>' +
            '<path d="M-32 -12 Q-30 -44 4 -47 Q40 -48 56 -12 Q61 6 52 18 Q48 -4 30 -20 Q8 -33 -32 -12Z" fill="' + CAP + '" ' + SW + '/>' +
            '<path d="M-31 -9 Q0 -34 32 -9 Q33 0 27 -3 Q0 -21 -27 -3 Q-33 0 -31 -9Z" fill="' + CREAM + '" ' + SW + '/>' +
            star(10, -34, 1.1) + star(32, -24, .8) + star(-14, -33, .8, '#fff') +
            '<g class="k-pom"><circle cx="53" cy="20" r="7.5" fill="' + CREAM + '" ' + SW + '/><path d="M49 18 q4-3 8 0" fill="none" stroke="#e8d9b8" stroke-width="1.5" stroke-linecap="round"/></g>' +
            '</g>';
    }
    function torso(arms) {
        return '<path d="M-24 0 Q0-8 24 0 L28 40 Q0 50-28 40Z" fill="' + PJ + '" ' + SW + '/>' +
            '<path d="M-6 -2 L0 8 L6 -2" fill="#fff" ' + SW + ' stroke-width="1.8"/>' +
            '<circle cx="0" cy="16" r="1.8" fill="' + INK + '"/><circle cx="0" cy="27" r="1.8" fill="' + INK + '"/>' + star(-14, 18, .9, '#fff') + star(13, 30, .9, '#fff') + star(-12, 33, .7, '#fff') + (arms || '');
    }
    function zz(x, y) {
        return '<g class="k-z" font-family="system-ui,sans-serif" font-weight="800" fill="#8b7cf6"><text x="' + x + '" y="' + y + '" font-size="15">z</text><text x="' + (x + 12) + '" y="' + (y - 14) + '" font-size="19" style="animation-delay:.7s">Z</text><text x="' + (x + 26) + '" y="' + (y - 30) + '" font-size="24" style="animation-delay:1.4s">Z</text></g>';
    }
    var FAB =
        '<svg class="k-svg" viewBox="0 0 160 150" aria-hidden="true">' +
        '<ellipse cx="80" cy="140" rx="46" ry="6" fill="#000" opacity=".16"/>' +
        /* ---- SIT: peluk bantal, ngantuk ---- */
        '<g class="s-sit"><g class="k-breath" transform="translate(80 92)">' + torso('') +
        '<path d="M-26 40 Q-30 52 -18 54 L18 54 Q30 52 26 40" fill="' + PJ + '" ' + SW + '/><ellipse cx="-16" cy="54" rx="9" ry="5" fill="' + SKIN + '" ' + SW + '/><ellipse cx="16" cy="54" rx="9" ry="5" fill="' + SKIN + '" ' + SW + '/></g>' +
        '<g transform="translate(80 92)"><rect x="-34" y="10" width="68" height="36" rx="13" fill="' + CREAM + '" ' + SW + '/><path d="M-26 20 q26 6 52 0 M-26 34 q26 6 52 0" fill="none" stroke="#e8d9b8" stroke-width="2" stroke-linecap="round"/><circle cx="0" cy="28" r="2" fill="#e8d9b8"/>' +
        '<ellipse cx="-30" cy="22" rx="9" ry="14" fill="' + PJ + '" ' + SW + '/><circle cx="-25" cy="33" r="5.5" fill="' + SKIN + '" ' + SW + '/><g class="k-armup"><ellipse cx="30" cy="22" rx="9" ry="14" fill="' + PJ + '" ' + SW + '/><circle cx="25" cy="33" r="5.5" fill="' + SKIN + '" ' + SW + '/></g></g>' +
        '<g transform="translate(80 56)">' + head('') + '</g>' +
        '<g class="k-q" font-family="system-ui,sans-serif" font-weight="800" fill="#7c6cf0"><text x="118" y="30" font-size="26">?</text></g>' +
        '<g class="k-hoam" font-family="system-ui,sans-serif" font-weight="800" fill="#8b7cf6" font-size="13"><text x="104" y="22">hoaam~</text></g></g>' +
        /* ---- SLEEP: tiduran peluk guling ---- */
        '<g class="s-sleep"><g class="k-breath2"><ellipse cx="45" cy="110" rx="34" ry="19" fill="' + CREAM + '" ' + SW + '/>' +
        '<path d="M62 92 Q104 84 136 96 Q146 106 138 116 Q104 126 62 120Z" fill="' + PJ + '" ' + SW + '/>' + star(88, 104, 1, '#fff') + star(112, 112, .9, '#fff') +
        '<ellipse cx="140" cy="102" rx="6" ry="7.5" fill="' + SKIN + '" ' + SW + '/><ellipse cx="138" cy="116" rx="6" ry="7.5" fill="' + SKIN + '" ' + SW + '/>' +
        '<g transform="translate(48 90) rotate(-14)">' + head('') + '</g></g>' +
        '<g><rect x="34" y="108" width="98" height="26" rx="13" fill="' + PINK + '" ' + SW + '/><path d="M58 109 v24 M82 109 v24 M106 109 v24" stroke="#f472b6" stroke-width="3"/><ellipse cx="62" cy="114" rx="9" ry="12" fill="' + PJ + '" ' + SW + '/><circle cx="52" cy="124" r="5.5" fill="' + SKIN + '" ' + SW + '/></g>' +
        zz(96, 66) + '</g>' +
        /* ---- CAR: main mobil-mobilan ---- */
        '<g class="s-car"><g transform="translate(56 92)">' + torso('') + '<path d="M-26 40 Q-30 52 -18 54 L18 54 Q30 52 26 40" fill="' + PJ + '" ' + SW + '/><ellipse cx="-16" cy="54" rx="9" ry="5" fill="' + SKIN + '" ' + SW + '/><ellipse cx="16" cy="54" rx="9" ry="5" fill="' + SKIN + '" ' + SW + '/>' +
        '<path d="M-24 6 Q-34 22 -28 34" fill="none" stroke="' + INK + '" stroke-width="13" stroke-linecap="round"/><path d="M-24 6 Q-34 22 -28 34" fill="none" stroke="' + PJ + '" stroke-width="9.6" stroke-linecap="round"/><circle cx="-28" cy="36" r="5.4" fill="' + SKIN + '" ' + SW + '/></g>' +
        '<g transform="translate(56 56)">' + head('') + '</g>' +
        '<g class="k-car"><g class="k-arm2"><path d="M76 98 Q96 110 112 124" fill="none" stroke="' + INK + '" stroke-width="13" stroke-linecap="round"/><path d="M76 98 Q96 110 112 124" fill="none" stroke="' + PJ + '" stroke-width="9.6" stroke-linecap="round"/><circle cx="113" cy="124" r="5.4" fill="' + SKIN + '" ' + SW + '/></g>' +
        '<path d="M104 128 Q104 114 118 114 L128 114 Q134 104 144 112 L152 118 Q156 122 156 128 L156 136 L104 136Z" fill="' + EM + '" ' + SW + '/><path d="M122 117 h8 q4-6 9-3 l4 3z" fill="#cffafe" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<g class="k-wheel"><circle cx="116" cy="136" r="7" fill="' + STAR + '" ' + SW + '/><path d="M116 130 v12 M110 136 h12" stroke="' + INK + '" stroke-width="1.6"/></g><g class="k-wheel"><circle cx="144" cy="136" r="7" fill="' + STAR + '" ' + SW + '/><path d="M144 130 v12 M138 136 h12" stroke="' + INK + '" stroke-width="1.6"/></g></g>' +
        '<g class="k-brm" font-family="system-ui,sans-serif" font-weight="800" fill="#10b981" font-size="13"><text x="100" y="104">brrm!</text></g></g>' +
        /* ---- FLY: terbang naik bantal ---- */
        '<g class="s-fly"><g class="k-flybob"><g class="k-cloud"><circle cx="18" cy="122" r="8" fill="#fff" opacity=".9"/><circle cx="30" cy="126" r="10" fill="#fff" opacity=".9"/><circle cx="10" cy="132" r="6" fill="#fff" opacity=".8"/></g>' +
        '<g transform="translate(80 84)"><g class="k-legs"><path d="M-12 38 q-6 18 3 26 M12 38 q6 18-3 26" fill="none" stroke="' + INK + '" stroke-width="12" stroke-linecap="round"/><path d="M-12 38 q-6 18 3 26 M12 38 q6 18-3 26" fill="none" stroke="' + PJ + '" stroke-width="8.6" stroke-linecap="round"/><ellipse cx="-7" cy="66" rx="6" ry="4.5" fill="' + SKIN + '" ' + SW + '/><ellipse cx="7" cy="66" rx="6" ry="4.5" fill="' + SKIN + '" ' + SW + '/></g>' + torso('') + '</g>' +
        '<g transform="translate(80 84) rotate(-5)"><rect x="-44" y="34" width="88" height="24" rx="12" fill="' + CREAM + '" ' + SW + '/><path d="M-30 46 h60" stroke="#e8d9b8" stroke-width="2" stroke-dasharray="3 5" stroke-linecap="round"/><ellipse cx="-30" cy="36" rx="8" ry="12" fill="' + PJ + '" transform="rotate(30 -30 36)" ' + SW + '/><circle cx="-38" cy="46" r="5" fill="' + SKIN + '" ' + SW + '/><ellipse cx="30" cy="36" rx="8" ry="12" fill="' + PJ + '" transform="rotate(-30 30 36)" ' + SW + '/><circle cx="38" cy="46" r="5" fill="' + SKIN + '" ' + SW + '/></g>' +
        '<g transform="translate(80 50)">' + head(' k-fly-head') + '</g></g></g>' +
        '</svg>';
    var PEEK =
        '<svg class="k-svg k-peeksvg" viewBox="0 0 160 96" aria-hidden="true"><g class="k-peekbob">' +
        '<g transform="translate(80 54)">' + head('') + '</g>' +
        '<g class="k-hand-l"><path d="M44 96 Q44 84 48 78" fill="none" stroke="' + INK + '" stroke-width="13" stroke-linecap="round"/><path d="M44 96 Q44 84 48 78" fill="none" stroke="' + PJ + '" stroke-width="9.6" stroke-linecap="round"/><circle cx="48" cy="76" r="6.2" fill="' + SKIN + '" ' + SW + '/></g>' +
        '<g class="k-hand-r"><path d="M116 96 Q116 84 112 78" fill="none" stroke="' + INK + '" stroke-width="13" stroke-linecap="round"/><path d="M116 96 Q116 84 112 78" fill="none" stroke="' + PJ + '" stroke-width="9.6" stroke-linecap="round"/><circle cx="112" cy="76" r="6.2" fill="' + SKIN + '" ' + SW + '/></g>' +
        '<g class="k-q" font-family="system-ui,sans-serif" font-weight="800" fill="#7c6cf0"><text x="124" y="22" font-size="24">?</text></g></g></svg>';
    var CSS =
        '.k-svg{display:block;width:100%;height:100%;overflow:visible}.k-lid,.k-pom,.k-yawn,.k-armup,.k-head,.k-breath,.k-breath2,.k-wheel,.k-legs,.k-hand-r,.k-z text,.k-peekbob,.k-flybob,.k-car,.k-cloud{transform-box:fill-box}' +
        '.s-sit,.s-sleep,.s-car,.s-fly{display:none}.sc-sit .s-sit,.sc-sleep .s-sleep,.sc-car .s-car,.sc-fly .s-fly{display:inline}' +
        '.k-lid{transform-origin:50% 0;transform:scaleY(var(--lid,.5))}' +
        '.k-eyes{transform:translate(var(--hx,0px),var(--hy,0px));transition:transform .14s ease-out}' +
        '.k-yawn{transform:scale(0);transform-origin:50% 50%}.k-q,.k-hoam,.k-brm,.k-z{opacity:0}' +
        '.k-pom{transform-origin:50% 0;animation:k-pom 2.8s ease-in-out infinite}@keyframes k-pom{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(10deg)}}' +
        /* sit */
        '.sc-sit{--lid:.55}.s-sit .k-lid{animation:k-sleepy 7s ease-in-out infinite}.s-sit .k-head{transform-origin:50% 90%;animation:k-nod 7s ease-in-out infinite}' +
        '@keyframes k-sleepy{0%,38%{transform:scaleY(.55)}52%,62%{transform:scaleY(1)}66%{transform:scaleY(.2)}78%,100%{transform:scaleY(.55)}}' +
        '@keyframes k-nod{0%,38%{transform:rotate(0)}52%,62%{transform:translateY(4px) rotate(8deg)}66%{transform:translateY(-2px) rotate(-3deg)}78%,100%{transform:rotate(0)}}' +
        '.k-breath{transform-origin:50% 100%;animation:k-breath 3.4s ease-in-out infinite}@keyframes k-breath{0%,100%{transform:translate(80px,92px) scale(1)}50%{transform:translate(80px,92px) scale(1.025,1.03)}}' +
        '.k-armup{transform-origin:50% 90%}.is-yawn .k-armup{animation:k-armup 2.6s ease-in-out}@keyframes k-armup{0%,100%{transform:rotate(0)}25%,70%{transform:rotate(-150deg)}}' +
        '.is-yawn .k-yawn{animation:k-yawn 2.6s ease-in-out}@keyframes k-yawn{0%,100%{transform:scale(0)}25%,70%{transform:scale(1.5)}}.is-yawn .k-mouth{opacity:0}.is-yawn .k-lid{animation:none;transform:scaleY(.95)}' +
        '.is-yawn .k-hoam{animation:k-pop 2.6s ease-out}@keyframes k-pop{0%{opacity:0;transform:translateY(6px)}20%,70%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-6px)}}' +
        /* sleep */
        '.sc-sleep{--lid:1}.k-breath2{transform-origin:50% 100%;animation:k-br2 3.6s ease-in-out infinite}@keyframes k-br2{0%,100%{transform:scale(1)}50%{transform:scale(1.012,1.035)}}' +
        '.sc-sleep .k-z{opacity:1}.k-z text{animation:k-z 3.2s ease-in-out infinite;opacity:0}@keyframes k-z{0%{opacity:0;transform:translateY(8px)}30%,60%{opacity:1}100%{opacity:0;transform:translate(6px,-12px)}}' +
        /* car */
        '.sc-car{--lid:.42}.s-car .k-lid{animation:k-blink 4.6s infinite}@keyframes k-blink{0%,92%,100%{transform:scaleY(.42)}96%{transform:scaleY(1)}}' +
        '.sc-car{--hx:2.4px}.k-car{animation:k-drive 2.6s ease-in-out infinite}@keyframes k-drive{0%,100%{transform:translateX(-14px)}50%{transform:translateX(0)}}' +
        '.k-wheel{transform-origin:50% 50%;animation:k-spin .9s linear infinite}@keyframes k-spin{to{transform:rotate(360deg)}}' +
        '.sc-car .k-brm{animation:k-brm 2.6s ease-in-out infinite}@keyframes k-brm{0%,100%{opacity:0;transform:translateX(-8px)}45%,60%{opacity:1;transform:none}}' +
        '.s-car .k-head{transform-origin:50% 90%;animation:k-bob2 2.6s ease-in-out infinite}@keyframes k-bob2{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}' +
        /* fly */
        '.sc-fly{--lid:.1}.k-flybob{animation:k-fly 2.8s ease-in-out infinite}@keyframes k-fly{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-7px) rotate(2deg)}}' +
        '.k-legs{animation:k-legs 1.3s ease-in-out infinite;transform-origin:50% 0}@keyframes k-legs{0%,100%{transform:rotate(5deg)}50%{transform:rotate(-5deg)}}' +
        '.k-cloud{animation:k-cloud 1.8s ease-in-out infinite}@keyframes k-cloud{0%{transform:translateX(8px);opacity:0}40%{opacity:1}100%{transform:translateX(-14px);opacity:0}}' +
        '.sc-fly .k-pom{animation-duration:.8s}' +
        /* states */
        '.is-think{--lid:.05}.is-think .k-lid{animation:none!important}.is-think .k-eyes{transform:translate(1.5px,-2.6px)}.is-think .k-q{opacity:1;animation:k-qb 1s ease-in-out infinite}@keyframes k-qb{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}' +
        '.is-talk{--lid:.15}.is-talk .k-lid{animation:none!important}.is-talk .k-mouth{opacity:0}.is-talk .k-yawn{animation:k-talk .3s ease-in-out infinite}@keyframes k-talk{0%,100%{transform:scale(.5,.4)}50%{transform:scale(.95,.85)}}' +
        '.is-hi .k-lid{animation:none!important}.is-hi{--lid:.05}' +
        /* peek */
        '.k-peekbob{animation:k-peek 3.2s ease-in-out infinite}@keyframes k-peek{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}' +
        '.k-peeksvg{--lid:.5}.k-peeksvg .k-lid{animation:k-blink 4s infinite}.k-hand-r{transform-origin:50% 100%}.pk.is-hi .k-hand-r,.pk.is-wave .k-hand-r{animation:k-wave .5s ease-in-out 4}@keyframes k-wave{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-14px) rotate(-14deg)}}' +
        '.pk.is-think .k-hand-l{animation:k-tap .45s ease-in-out infinite}@keyframes k-tap{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}' +
        '@media (prefers-reduced-motion:reduce){.k-svg *{animation:none!important}.k-svg .k-q{opacity:0}}';

    /* ---- Profesor Tido: berdiri di sebelah jawaban, berkacamata + topi toga, menunjuk-nunjuk sambil menjelaskan ---- */
    var COAT = '#9a7455', TROU = '#4a4468', RED = '#ef4444';
    function headProf() {
        return '<g class="k-head">' +
            '<ellipse cx="0" cy="-1" rx="34" ry="31" fill="' + HAIR + '" ' + SW + '/>' +
            '<path d="M-30 14 q-3 12 3 18 q3-8 6-12z M30 14 q3 12-3 18 q-3-8-6-12z" fill="' + HAIR + '" ' + SW + '/>' +
            '<ellipse cx="0" cy="3" rx="29.5" ry="26" fill="' + SKIN + '" ' + SW + '/>' +
            '<ellipse cx="-19.5" cy="13" rx="5.8" ry="3.4" fill="#ff9fb5" opacity=".6"/><ellipse cx="19.5" cy="13" rx="5.8" ry="3.4" fill="#ff9fb5" opacity=".6"/>' +
            '<g class="k-eyes">' + eye(-12.5) + eye(12.5) + '</g>' + lid(-12.5) + lid(12.5) +
            '<g class="kp-gl"><circle cx="-12.5" cy="5" r="11.5" fill="#fff" fill-opacity=".28" stroke="' + INK + '" stroke-width="2.6"/><circle cx="12.5" cy="5" r="11.5" fill="#fff" fill-opacity=".28" stroke="' + INK + '" stroke-width="2.6"/>' +
            '<path d="M-1.2 4 q1.2-2.2 2.4 0 M-24 3 L-30 0 M24 3 L30 0" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/><path d="M-18 0 q3-3 7-3" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".85"/></g>' +
            '<path d="M-18 -7.5 q5.5-3.2 11 0.4 M7 -7.1 q5.5-3.6 11-0.4" fill="none" ' + SW + ' stroke-width="1.7"/>' +
            '<path class="k-mouth" d="M-3.5 17.5 q3.5 2.6 7 0" fill="none" ' + SW + ' stroke-width="1.9"/>' +
            '<ellipse class="k-yawn" cx="0" cy="18.5" rx="4.4" ry="5.4" fill="#ff7a93" ' + SW + ' stroke-width="1.8"/>' +
            '<path d="M-30 -3 Q-33 -30 0 -31.5 Q33 -30 30 -3 Q25 -15 17 -13.5 Q12 -5 5.5 -17 Q0 -7 -6 -17 Q-12 -6 -17.5 -14.5 Q-26 -13 -30 -3Z" fill="' + HAIR + '" ' + SW + '/>' +
            '<path d="M-25 -20 Q0 -32 25 -20 L25 -32 Q0 -43 -25 -32Z" fill="#2f2a4a" ' + SW + '/>' +
            '<path d="M-44 -35 L0 -52 L44 -35 L0 -19Z" fill="#3b3560" ' + SW + '/><circle cx="0" cy="-36" r="2.8" fill="' + STAR + '" ' + SW + ' stroke-width="1.4"/>' +
            '<g class="kp-tassel"><path d="M0 -36 Q24 -38 38 -30" fill="none" stroke="#fbbf24" stroke-width="2.4" stroke-linecap="round"/><path d="M38 -30 v14" stroke="#fbbf24" stroke-width="4.5" stroke-linecap="round"/></g>' +
            '</g>';
    }
    var PROF =
        '<svg class="k-svg kp" viewBox="0 0 130 150" aria-hidden="true">' +
        '<ellipse cx="52" cy="144" rx="34" ry="5" fill="#000" opacity=".16"/>' +
        '<g class="kp-body">' +
        '<path d="M37 104 v24 M67 104 v24" stroke="' + INK + '" stroke-width="15" stroke-linecap="round"/><path d="M37 104 v24 M67 104 v24" stroke="' + TROU + '" stroke-width="11.4" stroke-linecap="round"/>' +
        '<ellipse cx="36" cy="132" rx="11" ry="6" fill="#2a2140" ' + SW + '/><ellipse cx="68" cy="132" rx="11" ry="6" fill="#2a2140" ' + SW + '/>' +
        '<g transform="translate(52 90)"><path d="M-24 0 Q0-8 24 0 L28 38 Q0 46-28 38Z" fill="' + COAT + '" ' + SW + '/><path d="M-8 -3 L0 18 L8 -3Z" fill="#fff" ' + SW + ' stroke-width="1.8"/>' +
        '<path d="M-9 -1 l9 4 l9 -4 l0 8 l-9 -4 l-9 4z" fill="' + RED + '" ' + SW + ' stroke-width="1.6"/><circle cx="0" cy="26" r="1.8" fill="' + INK + '"/><circle cx="0" cy="34" r="1.8" fill="' + INK + '"/>' +
        '<ellipse cx="-22" cy="26" rx="4" ry="3" fill="#b8916d" opacity=".9"/></g>' +
        /* tangan kiri pegang buku */
        '<path d="M28 98 Q22 112 30 120" fill="none" stroke="' + INK + '" stroke-width="12.5" stroke-linecap="round"/><path d="M28 98 Q22 112 30 120" fill="none" stroke="' + COAT + '" stroke-width="9" stroke-linecap="round"/>' +
        '<g transform="translate(14 112) rotate(-8)"><rect x="0" y="0" width="22" height="28" rx="3" fill="' + EM + '" ' + SW + '/><path d="M5 0 v28" stroke="' + INK + '" stroke-width="1.6"/><rect x="9" y="7" width="9" height="3" rx="1.5" fill="#fff" opacity=".85"/></g>' +
        '<circle cx="32" cy="120" r="5.5" fill="' + SKIN + '" ' + SW + '/>' +
        /* tangan kanan menunjuk dengan tongkat */
        '<g class="kp-point"><path d="M76 98 Q90 104 98 116" fill="none" stroke="' + INK + '" stroke-width="12.5" stroke-linecap="round"/><path d="M76 98 Q90 104 98 116" fill="none" stroke="' + COAT + '" stroke-width="9" stroke-linecap="round"/>' +
        '<path d="M98 116 L128 88" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/><path d="M98 116 L127 89" stroke="#d6a76c" stroke-width="2.6" stroke-linecap="round"/><circle cx="128" cy="88" r="3.2" fill="#fff" ' + SW + ' stroke-width="1.4"/>' +
        '<circle cx="98" cy="117" r="5.5" fill="' + SKIN + '" ' + SW + '/></g>' +
        '<g transform="translate(52 50)">' + headProf() + '</g>' +
        '</g></svg>';
    var PCSS =
        '.k-svg.kp{--lid:.04}.kp .k-lid{animation:kp-blink 4.4s infinite}@keyframes kp-blink{0%,92%,100%{transform:scaleY(.04)}96%{transform:scaleY(1)}}' +
        '.kp-body{transform-origin:50% 100%;transform-box:fill-box;animation:kp-idle 3.2s ease-in-out infinite}@keyframes kp-idle{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}' +
        '.is-talk .kp-body{animation:kp-bob .5s ease-in-out infinite}@keyframes kp-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}' +
        '.kp .k-head{transform-origin:50% 90%;animation:kp-tilt 4.4s ease-in-out infinite}@keyframes kp-tilt{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(3deg)}}' +
        '.kp-point{transform-box:view-box;transform-origin:76px 98px;animation:kp-ptr 2.6s ease-in-out infinite}.is-talk .kp-point{animation:kp-ptr .55s ease-in-out infinite}@keyframes kp-ptr{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(9deg)}}' +
        '.kp-tassel{transform-box:view-box;transform-origin:0 -36px;animation:kp-tas 2.4s ease-in-out infinite}@keyframes kp-tas{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(7deg)}}' +
        '.kp-gl{animation:kp-push 6s ease-in-out infinite}@keyframes kp-push{0%,86%,100%{transform:translateY(0)}90%{transform:translateY(-2.2px)}94%{transform:translateY(0)}}' +
        '.ec-prof.kp-in .k-svg{animation:kp-poof .95s cubic-bezier(.2,1.3,.4,1) both}@keyframes kp-poof{0%{transform:scale(0) rotate(-540deg);opacity:0}45%{opacity:1}70%{transform:scale(1.18) rotate(8deg)}100%{transform:none;opacity:1}}' +
        '.kp-puff{position:absolute;left:50%;top:48%;width:70px;height:70px;margin:-35px 0 0 -35px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,#fff 0,#e9e4ff 45%,rgba(167,139,250,0) 72%);opacity:0;animation:kp-puff .9s ease-out both}@keyframes kp-puff{0%{transform:scale(.3);opacity:.95}60%{opacity:.8}100%{transform:scale(2.1);opacity:0}}' +
        '@media (prefers-reduced-motion:reduce){.ec-prof .k-svg{animation:none!important}.kp-puff{display:none}}';
    var SCENES = ['sit', 'sleep', 'car', 'fly'];
    window.EwoksMascot = { fab: FAB, peek: PEEK, prof: PROF, css: CSS + PCSS, scenes: SCENES };
})();
