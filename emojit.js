// Aromien emojit: sama logiikka osallistujalle, isolle näytölle ja hallintaan.
(function () {
var EMOJIT = [[/vihre\S* omena/, "🍏"], [/omena|päärynä/, "🍐"], [/sitru|sitruuna|lime|greippi/, "🍋"], [/appelsiini|mandariini/, "🍊"],
  [/persik|aprikoo/, "🍑"], [/troop|ananas|mango|passio/, "🍍"], [/kirsik/, "🍒"], [/mansik|vadelm|punai\S* marj|punaherukk|karpalo/, "🍓"],
  [/mustik|mustaherukk|tum\S* marj/, "🫐"], [/rypäle|rusina|kuivahed|viikun/, "🍇"], [/melon/, "🍈"], [/kuk|ruusu|orvok|seljan/, "🌸"],
  [/hunaj/, "🍯"], [/paahtoleip|brioche|leipä|leivo|hiiva|keksi/, "🍞"], [/pähkin|mantel/, "🌰"], [/vanilj|kerma/, "🍦"],
  [/yrt|ruoho|heinä|minttu/, "🌿"], [/^tee|\stee\b/, "🍵"], [/minerä|kivi|liitu|suola/, "🪨"], [/mauste|pippuri|kaneli|neilik|inkiväär/, "🌶️"],
  [/kahvi|savu|paahde/, "☕"], [/suklaa|kaakao/, "🍫"], [/tammi|setri|puu/, "🪵"], [/sieni|metsänpohj/, "🍄"], [/nahka|tupakka/, "🍂"],
  [/karamel|kinuski|toffee/, "🍮"], [/voi$|voinen|voita/, "🧈"]];
window.VTAromiEmoji = function (t) {
  t = String(t || "");
  if (/^[^A-Za-zÅÄÖåäöÉéÜü0-9]/.test(t)) return "";
  var p = t.toLowerCase();
  for (var k = 0; k < EMOJIT.length; k++) if (EMOJIT[k][0].test(p)) return EMOJIT[k][1];
  return "";
};
})();
