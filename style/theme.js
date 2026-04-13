// Apply saved theme immediately to prevent flash
(function() {
    var theme = localStorage.getItem("theme") || "dark";
    if (theme === "light") document.documentElement.classList.add("light");
})();
