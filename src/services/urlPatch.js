/**
 * Patch URL pour Hermes (React Native Android)
 *
 * Rend protocol, pathname, search, hash settables via Object.defineProperty.
 * Corrige les erreurs "Cannot assign to property 'X' which has only a getter"
 * avec Supabase et Expo sur Android.
 */
(function () {
  try {
    var NativeURL = globalThis.URL;
    if (!NativeURL) return;
    var proto = NativeURL.prototype;

    // Teste si protocol est settable
    var needsPatch = false;
    try {
      var t = new NativeURL('http://x.com');
      t.protocol = 'https:';
      needsPatch = (t.protocol !== 'https:');
    } catch (_) {
      needsPatch = true;
    }

    if (!needsPatch) return;

    // Patch les 4 propriétés via Object.defineProperty
    var props = ['protocol', 'pathname', 'search', 'hash'];

    for (var i = 0; i < props.length; i++) {
      try {
        var prop = props[i];
        var desc = Object.getOwnPropertyDescriptor(proto, prop);

        if (!desc) continue;
        if (desc.set) continue;
        if (desc.configurable === false) continue;

        Object.defineProperty(proto, prop, {
          get: desc.get,
          set: function () {},
          enumerable: true,
          configurable: true,
        });
      } catch (e) {
        // Ignore les erreurs de patch
      }
    }
  } catch (e) {
    // Ignore les erreurs fatales
  }
})();
