import { applySessionVisibility, renderNavbar } from "./ui/navbar.js";

renderNavbar(document.querySelector("[data-navbar]"));
applySessionVisibility(document);