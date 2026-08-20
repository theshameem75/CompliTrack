const clientStyles = document.createElement("link");
clientStyles.rel = "stylesheet";
clientStyles.href = "frontend.css";
document.head.append(clientStyles);
import("./frontend.js").catch((error) => {
  console.error("CompliTrack failed to start", error);
  const toast = document.querySelector("#toast");
  if (toast) {
    toast.textContent = error.message || "CompliTrack failed to start";
    toast.classList.add("show", "error");
  }
});
