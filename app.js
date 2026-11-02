/* Front Studio - no dependencies, no tracking. */
(function () {
  "use strict";
  var d = document;
  function $(selector, parent) { return (parent || d).querySelector(selector); }
  function $$(selector, parent) { return Array.from((parent || d).querySelectorAll(selector)); }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  $("#year").textContent = new Date().getFullYear();

  var nav = $("#nav"), steps = $("#steps"), stepItems = $$("li", steps), ticking = false;
  function onScroll() {
    ticking = false;
    var height = d.documentElement.scrollHeight - window.innerHeight;
    var rect = steps.getBoundingClientRect();
    var progress = clamp((window.innerHeight * 0.75 - rect.top) / rect.height, 0, 1);
    nav.style.setProperty("--p", height > 0 ? window.scrollY / height : 0);
    steps.style.setProperty("--p", progress);
    stepItems.forEach(function (item, index, items) {
      item.classList.toggle("on", progress > index / items.length);
    });
  }
  function requestScroll() {
    if (!ticking && !d.hidden) { ticking = true; requestAnimationFrame(onScroll); }
  }
  window.addEventListener("scroll", requestScroll, { passive: true });
  window.addEventListener("resize", requestScroll);
  d.addEventListener("visibilitychange", function () { if (!d.hidden) requestScroll(); });
  onScroll();

  var comparison = $("#ba"), slider = $("input", comparison);
  slider.addEventListener("input", function () {
    comparison.style.setProperty("--pos", slider.value + "%");
  });

  var brand = $("#bp");
  var fonts = {
    modern: "var(--sans)",
    editorial: "'Iowan Old Style',Palatino,Georgia,serif",
    rounded: "ui-rounded,'SF Pro Rounded','Arial Rounded MT Bold',sans-serif"
  };
  function buttonGroup(selector, update) {
    var buttons = $$(selector + " button");
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        buttons.forEach(function (other) { other.setAttribute("aria-pressed", String(other === button)); });
        update(button);
      });
    });
  }
  buttonGroup("#sw", function (button) {
    brand.style.setProperty("--b1", button.dataset.c);
    brand.style.setProperty("--b2", button.dataset.b);
  });
  buttonGroup("#fo", function (button) { brand.style.setProperty("--bf", fonts[button.dataset.f]); });

  var estimator = $("#est"), area = $("#estArea");
  function calculate() {
    var rate = Number($("input[name=timber]:checked", estimator).value);
    var extras = $$(".chk input:checked", estimator).reduce(function (sum, input) { return sum + Number(input.value); }, 0);
    var base = Number(area.value) * rate + extras + 650;
    function money(value) { return "$" + (Math.round(value / 100) * 100).toLocaleString("en-NZ"); }
    $("#estAreaOut").textContent = area.value + " m\u00b2";
    $("#estOut").textContent = money(base * 0.94) + " - " + money(base * 1.08);
    area.style.setProperty("--fill", (Number(area.value) - Number(area.min)) / (Number(area.max) - Number(area.min)) * 100 + "%");
  }
  estimator.addEventListener("input", calculate);
  calculate();

  var booking = $("#bk"), daysElement = $(".bk-days", booking), slotsElement = $(".bk-slots", booking);
  var bookButton = $(".bk-go", booking), resetButton = $(".bk-reset", booking);
  var slots = ["8:30am", "10:00am", "11:30am", "1:00pm", "2:30pm", "4:00pm"];
  var days = [], date = new Date(), selectedDay = 0, selectedSlot = -1;
  date.setHours(12, 0, 0, 0);
  while (days.length < 6) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0) days.push(new Date(date));
  }
  function dayLabel(day) { return day.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" }); }
  function selectionLabel() { return dayLabel(days[selectedDay]) + ", " + slots[selectedSlot]; }
  function updateBooking() {
    bookButton.disabled = selectedSlot < 0;
    bookButton.textContent = selectedSlot < 0 ? "Choose a time" : "Try " + selectionLabel();
  }
  function renderDays() {
    daysElement.replaceChildren();
    days.forEach(function (day, index) {
      var button = d.createElement("button"), name = d.createElement("span"), number = d.createElement("b");
      button.type = "button";
      button.setAttribute("aria-pressed", String(index === selectedDay));
      button.setAttribute("aria-label", dayLabel(day));
      name.textContent = day.toLocaleDateString("en-NZ", { weekday: "short" });
      number.textContent = day.getDate();
      button.append(name, number);
      button.addEventListener("click", function () {
        selectedDay = index; selectedSlot = -1;
        $$("button", daysElement).forEach(function (other) { other.setAttribute("aria-pressed", String(other === button)); });
        renderSlots(); updateBooking();
      });
      daysElement.appendChild(button);
    });
  }
  function renderSlots() {
    slotsElement.replaceChildren();
    slots.forEach(function (slot, index) {
      var button = d.createElement("button");
      button.type = "button"; button.textContent = slot;
      button.disabled = (days[selectedDay].getDate() * 7 + index * 5) % 4 === 0 || (days[selectedDay].getDay() === 6 && index > 2);
      button.setAttribute("aria-pressed", String(index === selectedSlot));
      button.addEventListener("click", function () {
        selectedSlot = index;
        $$("button", slotsElement).forEach(function (other) { other.setAttribute("aria-pressed", String(other === button)); });
        updateBooking();
      });
      slotsElement.appendChild(button);
    });
  }
  bookButton.addEventListener("click", function () {
    if (selectedSlot < 0) return;
    $(".bk-when", booking).textContent = selectionLabel() + ". Demo only. Nothing has been booked, reserved or sent.";
    booking.classList.add("done");
    resetButton.focus({ preventScroll: true });
  });
  resetButton.addEventListener("click", function () {
    booking.classList.remove("done"); selectedSlot = -1;
    renderSlots(); updateBooking();
    $("button:not(:disabled)", slotsElement).focus({ preventScroll: true });
  });
  renderDays(); renderSlots(); updateBooking();

  var brief = $("#brief"), packageSelect = $("#package"), status = $("#copy-status");
  var email = "hello@frontstudio.co.nz";
  function briefText() {
    return "Hello Front Studio,\n\nBusiness: " + $("#business").value.trim() +
      "\nInterested in: " + packageSelect.value +
      "\n\nAbout the business and what we need:\n" + $("#about").value.trim() +
      "\n\nCurrent website (if any):\nIdeal timing:\n\nThanks";
  }
  $$("[data-package]").forEach(function (link) {
    link.addEventListener("click", function () {
      packageSelect.value = link.dataset.package;
      status.textContent = "Selected: " + packageSelect.value + ".";
    });
  });
  brief.addEventListener("submit", function (event) {
    event.preventDefault();
    var subject = "Website enquiry - " + $("#business").value.trim();
    window.location.href = "mailto:" + email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(briefText());
    status.textContent = "Email draft requested. If your email app didn't open, use Copy brief. Nothing has been sent yet.";
  });
  function copy(text, success) {
    function failed() {
      status.textContent = "Clipboard unavailable. Select and copy the text below instead.";
      var fallback = $("#copy-fallback");
      if (!fallback) {
        fallback = d.createElement("textarea"); fallback.id = "copy-fallback";
        fallback.readOnly = true; fallback.setAttribute("aria-label", "Text to copy manually");
        brief.appendChild(fallback);
      }
      fallback.value = text; fallback.focus(); fallback.select();
    }
    if (!navigator.clipboard || !navigator.clipboard.writeText) { failed(); return; }
    navigator.clipboard.writeText(text).then(function () {
      var fallback = $("#copy-fallback");
      if (fallback) fallback.remove();
      status.textContent = success;
    }, failed);
  }
  $("#copy").addEventListener("click", function () { copy(email, "Email address copied. Paste it into your email app."); });
  $("#copy-brief").addEventListener("click", function () {
    if (!brief.reportValidity()) return;
    copy(briefText(), "Brief copied. Email it to " + email + ". Nothing has been sent yet.");
  });
  brief.hidden = false;
})();
