// Theme Toggle Web Component based on theme-toggle-main
const template = document.createElement("template");
template.innerHTML = `
  <style>
    .theme-toggle {
      --ease-3: cubic-bezier(0.25, 0, 0.3, 1);
      --ease-out-5: cubic-bezier(0, 0, 0, 1);
      --ease-elastic-3: cubic-bezier(0.5, 1.25, 0.75, 1.25);
      --ease-elastic-4: cubic-bezier(0.5, 1.5, 0.75, 1.25);
      --size: 2.2rem;
      --icon-fill: #454d54;
      --icon-fill-hover: #22262a;
      -webkit-tap-highlight-color: transparent;
      aspect-ratio: 1;
      background: none;
      block-size: var(--size);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      inline-size: var(--size);
      outline-offset: 5px;
      padding: 0;
      touch-action: manipulation;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s var(--ease-elastic-3);
    }
    .theme-toggle:hover {
      transform: scale(1.1);
    }
    .theme-toggle:focus-visible {
      outline: 2px solid var(--icon-fill);
      outline-offset: 5px;
    }
    .theme-toggle > svg {
      stroke-linecap: round;
      block-size: 100%;
      inline-size: 100%;
    }
    :host-context([data-theme="dark"]) .theme-toggle {
      --icon-fill: #abb3ba;
      --icon-fill-hover: #e2e6e9;
    }
    :host-context([data-theme="light"]) .theme-toggle {
      --icon-fill: #f5d061;
      --icon-fill-hover: #ffe08a;
    }
    @media (hover: none) {
      .theme-toggle {
        --size: 48px;
      }
    }
    .sun-and-moon > .moon,
    .sun-and-moon > .sun,
    .sun-and-moon > .sun-beams {
      transform-origin: center center;
    }
    .sun-and-moon > .moon,
    .sun-and-moon > .sun {
      fill: var(--icon-fill);
    }
    .theme-toggle:hover > .sun-and-moon > .moon,
    .theme-toggle:hover > .sun-and-moon > .sun {
      fill: var(--icon-fill-hover);
    }
    .sun-and-moon > .sun-beams {
      stroke: var(--icon-fill);
      stroke-width: 2px;
    }
    .theme-toggle:hover .sun-and-moon > .sun-beams {
      stroke: var(--icon-fill-hover);
    }
    :host-context([data-theme="dark"]) .sun-and-moon > .sun {
      transform: scale(1.75);
    }
    :host-context([data-theme="dark"]) .sun-and-moon > .sun-beams {
      opacity: 0;
    }
    :host-context([data-theme="dark"]) .sun-and-moon > .moon > circle {
      transform: translate(-7px);
    }
    @supports (cx: 1) {
      :host-context([data-theme="dark"]) .sun-and-moon > .moon > circle {
        cx: 17;
        transform: translate(0);
      }
    }
    @media (prefers-reduced-motion: no-preference) {
      .sun-and-moon > .sun {
        transition: transform 0.5s var(--ease-elastic-3);
      }
      .sun-and-moon > .sun-beams {
        transition: transform 0.5s var(--ease-elastic-4), opacity 0.5s var(--ease-3);
      }
      .sun-and-moon .moon > circle {
        transition: transform 0.25s var(--ease-out-5);
      }
      @supports (cx: 1) {
        .sun-and-moon .moon > circle {
          transition: cx 0.25s var(--ease-out-5);
        }
      }
      :host-context([data-theme="dark"]) .sun-and-moon > .sun {
        transform: scale(1.75);
        transition-duration: 0.25s;
        transition-timing-function: var(--ease-3);
      }
      :host-context([data-theme="dark"]) .sun-and-moon > .sun-beams {
        transform: rotate(-25deg);
        transition-duration: 0.15s;
      }
      :host-context([data-theme="dark"]) .sun-and-moon > .moon > circle {
        transition-delay: 0.25s;
        transition-duration: 0.5s;
      }
    }
  </style>
  <button class="theme-toggle" id="theme-toggle" title="Toggle Dark/Light Mode" aria-label="Toggle dark and light mode" aria-live="polite">
    <svg class="sun-and-moon" aria-hidden="true" width="24" height="24" viewBox="0 0 24 24">
      <circle class="sun" cx="12" cy="12" r="6" mask="url(#moon-mask)" fill="currentColor" />
      <g class="sun-beams" stroke="currentColor">
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </g>
      <mask class="moon" id="moon-mask">
        <rect x="0" y="0" width="100%" height="100%" fill="white" />
        <circle cx="24" cy="10" r="6" fill="black" />
      </mask>
    </svg>
  </button>
`;

class ThemeToggle extends HTMLElement {
  _initialTheme = "";

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  get theme() {
    return this.getAttribute("theme");
  }

  set theme(theme) {
    this.setAttribute("theme", theme);
  }

  initTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (!savedTheme) {
      return "dark";
    }
    // Strip any "-theme" suffix and return bare theme name
    if (savedTheme.endsWith("-theme")) {
      const bareTheme = savedTheme.replace("-theme", "");
      return bareTheme === "dark" || bareTheme === "light" ? bareTheme : "dark";
    }
    // Handle case where savedTheme is already bare "dark" or "light"
    return savedTheme === "dark" || savedTheme === "light" ? savedTheme : "dark";
  }

  toggleTheme = () => {
    const currentTheme = this.theme;
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    this.setTheme(newTheme);
  };

  setTheme(theme) {
    // Validate theme parameter
    if (theme !== "dark" && theme !== "light") {
      console.warn(`Invalid theme value: "${theme}". Defaulting to "dark".`);
      theme = "dark";
    }
    
    this.theme = theme;
    const themeClass = theme === "dark" ? "dark-theme" : "light-theme";
    const button = this.shadowRoot.querySelector("#theme-toggle");
    
    document.body.classList.remove("dark-theme", "light-theme");
    document.body.classList.add(themeClass);
    document.documentElement.setAttribute("data-theme", theme);
    
    // Save bare theme string to localStorage (without "-theme" suffix)
    localStorage.setItem("theme", theme);
    
    // Update aria-label to reflect current action
    if (button) {
      const action = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
      button.setAttribute("aria-label", action);
    }
  }

  connectedCallback() {
    this._initialTheme = this.initTheme();
    this.render();
    
    // Validate and explicitly map known theme values
    if (this._initialTheme === "dark") {
      this.setTheme("dark");
    } else if (this._initialTheme === "light") {
      this.setTheme("light");
    } else {
      // Handle invalid or corrupted values - revert to safe default
      console.warn(`Invalid initial theme value: "${this._initialTheme}". Reverting to "dark".`);
      this.setTheme("dark");
    }

    // Add event listener
    const themeButton = this.shadowRoot.querySelector("#theme-toggle");
    if (themeButton && themeButton.isConnected) {
      themeButton.addEventListener("click", this.toggleTheme);
    }
    
    // Listen for external theme changes
    document.body.addEventListener("theme-change", (e) => {
      this.setTheme(e.detail.theme);
    });
  }

  render() {
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }
}

// Only define if not already defined
if (!customElements.get("theme-toggle")) {
  customElements.define("theme-toggle", ThemeToggle);
}

export default ThemeToggle;

