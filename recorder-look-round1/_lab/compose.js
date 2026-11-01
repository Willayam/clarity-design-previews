// Builds one page from section fragments: sections/<slot>/<id>.html, one pick per slot.
// Query: ?picks=hero:b,faq:a  ?only=hero  plus any lab controls, which fragments may read.
(function () {
  "use strict";
  var params = new URLSearchParams(location.search);
  var only = params.get("only");
  var picks = {};
  (params.get("picks") || "").split(",").forEach(function (p) {
    var kv = p.split(":");
    if (kv[0] && kv[1]) picks[kv[0]] = kv[1];
  });

  function getData() {
    return fetch("_lab/api/lab", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function () { return fetch("lab-data.json", { cache: "no-store" }).then(function (r) { return r.json(); }); });
  }

  function inject(mount, html) {
    var t = document.createElement("template");
    t.innerHTML = html;
    var meta = t.content.querySelector("#lab-meta");
    if (meta) meta.remove();
    var scripts = Array.prototype.slice.call(t.content.querySelectorAll("script"));
    scripts.forEach(function (s) { s.remove(); });
    mount.appendChild(t.content);
    scripts.forEach(function (old) {
      var s = document.createElement("script");
      Array.prototype.forEach.call(old.attributes, function (a) { s.setAttribute(a.name, a.value); });
      if (old.src) s.async = false;
      s.textContent = old.textContent;
      mount.appendChild(s);
    });
  }

  function compose(d) {
    var lab = d.lab || {};
    (lab.pageHead || []).forEach(function (href) {
      var l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      document.head.appendChild(l);
    });
    if (lab.pageClass) document.body.className = lab.pageClass;
    document.title = (lab.title || "Page") + " (lab page)";
    var page = document.getElementById("lab-page");
    var slots = (d.slots || []).filter(function (s) { return !only || s.id === only; });
    return slots.reduce(function (chain, s) {
      return chain.then(function () {
        var mount = document.createElement("div");
        mount.className = "lab-slot";
        mount.setAttribute("data-part", s.id);
        page.appendChild(mount);
        var locked = (lab.locked || {})[s.id];
        var rec = s.variants.filter(function (v) { return v.recommended; })[0];
        var want = picks[s.id] || locked || (rec && rec.id) || (s.variants[0] && s.variants[0].id);
        var v = s.variants.filter(function (x) { return x.id === want; })[0] || s.variants[0];
        if (!v) {
          mount.innerHTML = '<div style="padding:24px;color:#888;font:13px system-ui">' + s.label + ": no variants yet</div>";
          return;
        }
        mount.setAttribute("data-variant", s.id + ":" + v.id);
        return fetch(v.file, { cache: "no-store" }).then(function (r) { return r.text(); }).then(function (html) { inject(mount, html); });
      });
    }, Promise.resolve());
  }

  function done() {
    document.dispatchEvent(new Event("lab:composed"));
    if (window.__labReport) window.__labReport();
  }

  document.addEventListener("DOMContentLoaded", function () {
    getData().then(compose).then(done, function (e) {
      document.getElementById("lab-page").textContent = "Could not build the page: " + e;
      done();
    });
  });
})();
