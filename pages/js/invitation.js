(function () {
  const data = window.invitation;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const text = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  };

  text("seal-hint-ar", data.seal.ar);
  text("seal-hint-en", data.seal.en);
  text("eyebrow-ar", data.eyebrow.ar);
  text("eyebrow-en", data.eyebrow.en);
  text("groom-ar", data.groom.ar);
  text("bride-ar", data.bride.ar);
  text("groom-en", data.groom.en);
  text("bride-en", data.bride.en);
  text("date-ar", data.dateLabel.ar);
  text("date-en", data.dateLabel.en);
  text("line-ar", data.line.ar);
  text("line-en", data.line.en);
  text("verse-ar", data.verse.ar);
  text("verse-en", data.verse.en);
  text("verse-ref-ar", data.verse.arRef);
  text("verse-ref-en", data.verse.enRef);
  text("count-title-ar", data.countdownTitle.ar);
  text("count-title-en", data.countdownTitle.en);
  text("schedule-title-ar", data.scheduleTitle.ar);
  text("schedule-title-en", data.scheduleTitle.en);
  text("places-title-ar", data.placesTitle.ar);
  text("places-title-en", data.placesTitle.en);
  text("gallery-title-ar", data.galleryTitle.ar);
  text("gallery-title-en", data.galleryTitle.en);
  text("closing-mark-ar", data.closingMark.ar);
  text("closing-mark-en", data.closingMark.en);
  text("closing-ar", data.closing.ar);
  text("closing-en", data.closing.en);
  text("wishes-title-ar", data.wishesTitle.ar);
  text("wishes-title-en", data.wishesTitle.en);
  text("wish-to-ar", data.wishesTo.ar);
  text("wish-to-en", data.wishesTo.en);
  text("wish-groom-ar", data.groom.ar);
  text("wish-groom-en", data.groom.en);
  text("wish-bride-ar", data.bride.ar);
  text("wish-bride-en", data.bride.en);
  text("wish-both-ar", data.wishesBoth.ar);
  text("wish-both-en", data.wishesBoth.en);
  text("wish-message-ar", data.wishesMessage.ar);
  text("wish-message-en", data.wishesMessage.en);
  text("wish-name-ar", data.wishesName.ar);
  text("wish-name-en", data.wishesName.en);
  text("wish-attend-ar", data.wishesAttend.ar);
  text("wish-attend-en", data.wishesAttend.en);
  text("wish-yes-ar", data.wishesYes.ar);
  text("wish-yes-en", data.wishesYes.en);
  text("wish-no-ar", data.wishesNo.ar);
  text("wish-no-en", data.wishesNo.en);
  text("wish-send-ar", data.wishesSend.ar);
  text("wish-send-en", data.wishesSend.en);
  text("wish-thanks-ar", data.wishesThanks.ar);
  text("wish-thanks-en", data.wishesThanks.en);
  text("wish-error-ar", data.wishesInvalid.ar);
  text("wish-error-en", data.wishesInvalid.en);

  const wishForm = document.getElementById("wish-form");
  if (wishForm) {
    wishForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const fields = new FormData(wishForm);
      const attending = fields.get("attending");
      const wishError = document.getElementById("wish-error");
      const button = wishForm.querySelector("button");
      if (button) button.disabled = true;
      if (wishError) wishError.hidden = true;
      fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(fields.get("name") || "").trim(),
          to: String(fields.get("to") || ""),
          message: String(fields.get("message") || "").trim(),
          attending: attending === "yes"
        })
      }).then((response) => {
        if (!response.ok) throw new Error("invalid");
        wishForm.hidden = true;
        const wishThanks = document.getElementById("wish-thanks");
        if (wishThanks) wishThanks.hidden = false;
      }).catch(() => {
        if (wishError) wishError.hidden = false;
        if (button) button.disabled = false;
      });
    });
  }

  document.title = data.groom.en + " & " + data.bride.en + " | Wedding Invitation";
  const heroImg = document.getElementById("hero-img");
  if (heroImg && data.hero) {
    heroImg.src = data.hero;
    heroImg.alt = data.groom.en + " and " + data.bride.en;
  }
  document.body.classList.add("is-sealed");

  const sealScreen = document.getElementById("seal-screen");
  const sealButton = document.getElementById("seal-button");
  sealButton.addEventListener("click", placeRing);

  const intro = document.getElementById("intro-video");
  const introLimit = 240;

  function placeRing() {
    if (sealScreen.classList.contains("is-playing") || sealScreen.classList.contains("is-open")) return;
    if (reduced || !intro) {
      sealScreen.classList.add("is-placing");
      window.setTimeout(openSeal, reduced ? 0 : 560);
      return;
    }
    sealScreen.classList.add("is-playing");
    intro.play().catch(function () { openSeal(); });
  }

  if (intro) {
    intro.addEventListener("loadeddata", function () {
      if (intro.currentTime < 0.15) intro.currentTime = 0.4;
    });
    intro.addEventListener("timeupdate", function () {
      const bar = document.getElementById("intro-bar");
      const length = Math.min(intro.duration || introLimit, introLimit);
      if (bar && length) bar.style.width = Math.min(100, (intro.currentTime / length) * 100) + "%";
      if (intro.currentTime >= introLimit) {
        intro.pause();
        openSeal();
      }
    });
    intro.addEventListener("ended", openSeal);
  }

  function openSeal() {
    if (sealScreen.classList.contains("is-open")) return;
    sealScreen.classList.add("is-open");
    document.body.classList.remove("is-sealed");
    const delay = reduced ? 200 : 1100;
    window.setTimeout(() => {
      sealScreen.classList.add("is-gone");
      sealScreen.setAttribute("aria-hidden", "true");
    }, delay);
    if (musicReady) playMusic();
  }

  const units = ["days", "hours", "minutes", "seconds"];
  const countGrid = document.getElementById("count-grid");
  const countDone = document.getElementById("count-done");
  units.forEach((unit) => {
    const cell = document.createElement("div");
    cell.className = "count-cell";
    cell.innerHTML =
      '<strong id="count-' + unit + '">00</strong>' +
      '<span lang="ar" dir="rtl">' + data.countdownLabels[unit].ar + "</span>" +
      '<span lang="en">' + data.countdownLabels[unit].en + "</span>";
    countGrid.appendChild(cell);
  });
  countDone.innerHTML =
    '<span lang="ar" dir="rtl">' + data.countdownDone.ar + "</span>" +
    '<span lang="en">' + data.countdownDone.en + "</span>";

  const target = new Date(data.date).getTime();
  function tick() {
    const diff = target - Date.now();
    if (!Number.isFinite(target) || diff <= 0) {
      units.forEach((unit) => {
        document.getElementById("count-" + unit).textContent = "00";
      });
      countGrid.hidden = true;
      countDone.hidden = false;
      countDone.classList.add("is-shown");
      return;
    }
    const parts = {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff / 3600000) % 24),
      minutes: Math.floor((diff / 60000) % 60),
      seconds: Math.floor((diff / 1000) % 60)
    };
    units.forEach((unit) => {
      document.getElementById("count-" + unit).textContent = String(parts[unit]).padStart(2, "0");
    });
  }
  tick();
  window.setInterval(tick, 1000);

  const scheduleList = document.getElementById("schedule-list");
  data.schedule.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML =
      '<div class="time">' + item.time + "</div>" +
      '<div class="event"><p lang="ar" dir="rtl">' + item.ar + "</p>" +
      '<p lang="en">' + item.en + "</p></div>";
    scheduleList.appendChild(li);
  });

  const venueList = document.getElementById("venue-list");
  data.venues.forEach((venue) => {
    const card = document.createElement("article");
    card.className = "venue-card";
    const map = venue.map && venue.map !== "#" ? venue.map : "#";
    card.innerHTML =
      '<p class="kind"><span lang="ar" dir="rtl">' + venue.kind.ar + "</span>" +
      '<span lang="en">' + venue.kind.en + "</span></p>" +
      "<h3><span lang=\"ar\" dir=\"rtl\">" + venue.name.ar + "</span>" +
      '<span lang="en">' + venue.name.en + "</span></h3>" +
      '<p class="city"><span lang="ar" dir="rtl">' + venue.city.ar + "</span>" +
      '<span lang="en">' + venue.city.en + "</span></p>" +
      '<a class="map-link" href="' + map + '" target="_blank" rel="noopener">' +
      '<span class="map-word"><span lang="ar" dir="rtl">' + data.mapLabel.ar + "</span>" +
      '<span lang="en">' + data.mapLabel.en + "</span></span>" +
      '<span class="map-place"><span lang="ar" dir="rtl">' + data.locationLabel.ar + "</span>" +
      '<span lang="en">' + data.locationLabel.en + "</span></span></a>";
    venueList.appendChild(card);
  });

  const galleryGrid = document.getElementById("gallery-grid");
  const loaded = [];
  data.gallery.forEach((src, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "frame";
    const img = document.createElement("img");
    img.alt = data.groom.en + " and " + data.bride.en + " " + (index + 1);
    img.src = src;
    const fallback = document.createElement("span");
    fallback.className = "frame-fallback";
    fallback.innerHTML = "A &amp; L<small>" + src + "</small>";
    img.addEventListener("error", () => {
      button.classList.add("is-empty");
      button.disabled = true;
    });
    img.addEventListener("load", () => {
      loaded.push({ src: src, alt: img.alt, button: button });
    });
    button.addEventListener("click", () => {
      const at = loaded.findIndex((item) => item.button === button);
      if (at >= 0) openLightbox(at);
    });
    button.append(img, fallback);
    galleryGrid.appendChild(button);
  });

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  let lightboxIndex = 0;

  function openLightbox(index) {
    lightboxIndex = index;
    lightboxImg.src = loaded[index].src;
    lightboxImg.alt = loaded[index].alt;
    lightbox.hidden = false;
  }
  function stepLightbox(delta) {
    if (!loaded.length) return;
    lightboxIndex = (lightboxIndex + delta + loaded.length) % loaded.length;
    openLightbox(lightboxIndex);
  }
  document.getElementById("lightbox-close").addEventListener("click", () => {
    lightbox.hidden = true;
    lightboxImg.removeAttribute("src");
  });
  document.getElementById("lightbox-prev").addEventListener("click", () => stepLightbox(-1));
  document.getElementById("lightbox-next").addEventListener("click", () => stepLightbox(1));
  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) return;
    if (event.key === "Escape") lightbox.hidden = true;
    if (event.key === "ArrowRight") stepLightbox(1);
    if (event.key === "ArrowLeft") stepLightbox(-1);
  });

  const reveals = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) {
    reveals.forEach((node) => node.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 });
    reveals.forEach((node) => observer.observe(node));
  }

  const musicButton = document.getElementById("music-button");
  const music = document.getElementById("music");
  let musicReady = false;

  function playMusic() {
    music.play().then(() => musicButton.classList.add("is-playing")).catch(() => {});
  }

  musicButton.addEventListener("click", () => {
    if (!musicReady) return;
    if (music.paused) playMusic();
    else {
      music.pause();
      musicButton.classList.remove("is-playing");
    }
  });

  fetch(data.music, { method: "HEAD" })
    .then((response) => {
      if (!response.ok) return;
      music.src = data.music;
      musicReady = true;
      musicButton.hidden = false;
      musicButton.setAttribute("aria-label", "Music");
    })
    .catch(() => {});
})();
