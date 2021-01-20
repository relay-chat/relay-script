import { Domain, getDomain } from "./util/domainData";
import "./main.css";
import logo from "./logo.svg";
import isHexColor from "./util/validation";

interface RelayWindow extends Window {
  relay?: RelayScript;
}
class RelayScript {
  container: HTMLIFrameElement;
  button: HTMLButtonElement;
  minimized: boolean;
  initialized: boolean;
  domain: null | Domain;

  static windowLocation = window?.location?.href;
  static iframeLocation = "https://app.relaychat.app";
  static iframeId = "relay-iframe";
  static buttonId = "relay-btn";
  static containerId = "relay-container";
  static openClass = "relay-open";
  static currentScript = document?.currentScript;
  static searchParams = RelayScript.getSearchParams();
  static relayQueryKeys = [
    "relay_open",
    "message_id",
    "bucket",
    "parent_message_id",
    "relay_password_reset",
    "relay_token",
    "room_name",
    "toast_message",
    "toast_type",
  ];

  constructor() {
    this.minimized = true;
    this.initialized = false;
    this.domain = null;

    this.addLoadScrollbarWidthListener();
    this.addInnerHeightListener();
    this.addPopstateListener();
    this.addMessageListener();

    this.container = RelayScript.createIframe();
    this.button = this.createButton();
    this.setDomain();
    this.setPosition();
    this.attachContainer();
  }

  minimize() {
    this.handleMinimized(true);
    this.clearRelayQueryParams();
  }

  unminimize() {
    this.handleMinimized(false);
  }

  setUsername(username: string) {
    if (typeof username !== "string") {
      return console.error(
        "tried to set a Relay username that was not a string"
      );
    } else if (!this.initialized) {
      return console.error(
        "tried to set a Relay username before Relay was initialized"
      );
    }

    this.postMessage({ action: "setRelayUsername", data: { username } });
  }

  private static addScrollbarWidthCssVariable() {
    document?.documentElement?.style?.setProperty(
      "--scrollbar-width",
      `${window.innerWidth - (document?.documentElement?.clientWidth || 0)}px`
    );
  }

  private static addInnerHeightCssVariable() {
    document?.documentElement?.style?.setProperty(
      "--inner-height",
      `${window?.innerHeight || 0}px`
    );
  }

  private static createIframe() {
    const iframe = document.createElement("iframe");
    iframe.src = RelayScript.iframeLocation;
    iframe.id = RelayScript.iframeId;
    return iframe;
  }

  private static monkeyPatchHistory(
    key: "pushState" | "replaceState",
    cb: Function
  ) {
    const existingHandler = window?.history?.[key];
    if (existingHandler) {
      window.history[key] = function () {
        // @ts-ignore
        existingHandler.apply(history, arguments);
        cb(arguments);
      };
    }
  }

  private static getSearchParams() {
    const src = (RelayScript.currentScript as HTMLScriptElement)?.src;
    if (!src) {
      return null;
    }

    const rawSearch = new URL(src).search;
    return new URLSearchParams(rawSearch);
  }

  private static getHardcodedLocation() {
    const searchPath = RelayScript.searchParams?.get("path");
    if (!searchPath) {
      return null;
    }

    const hardcodedLocation = `${window.location.origin}${searchPath}`;
    try {
      new URL(hardcodedLocation);
      return hardcodedLocation;
    } catch (e) {
      console.error(
        "Tried to set an invalid path for relay. Check your path param. Make sure it's only the pathname and not the entire URL."
      );
      return null;
    }
  }

  private setDomain() {
    getDomain().then((domain) => {
      if (domain) {
        this.domain = domain;
      }
      this.setButtonBackgroundDynamically();
      this.validateAgainstWhiteList();
    });
  }

  private attachContainer() {
    document?.body?.appendChild(this.container);
  }

  private attachButton() {
    document?.body?.appendChild(this.button);
  }

  private detachContainer() {
    if (document?.body?.contains(this.container)) {
      document?.body?.removeChild(this.container);
    }
  }

  private detachButton() {
    if (document?.body?.contains(this.button)) {
      document?.body?.removeChild(this.button);
    }
  }

  private createButton() {
    const button = document.createElement("button");
    const buttonImg = document.createElement("img");
    buttonImg.src = logo;
    button.appendChild(buttonImg);
    button.id = RelayScript.buttonId;
    button.addEventListener("click", this.onButtonClick.bind(this));

    const buttonBottom = RelayScript.searchParams?.get("button_bottom");
    if (buttonBottom) {
      button.style.bottom = buttonBottom;
    }

    return button;
  }

  private setPosition() {
    const position = RelayScript.searchParams?.get("position");
    if (position === "left") {
      this.button.classList.add("left");
      this.container.classList.add("left");
    }
  }

  private setButtonBackgroundDynamically() {
    const searchButtonColor = RelayScript.searchParams?.get("button_color");

    // don't require the # because otherwise it would need to be
    // URL encoded as %23
    if (isHexColor(`#${searchButtonColor}`)) {
      this.button.style.background = `#${searchButtonColor}`;
    } else if (this.domain?.button_color) {
      this.button.style.background = this.domain.button_color;
    }
  }

  private validateAgainstWhiteList() {
    const whitelist = this.domain?.path_whitelist;
    if (!whitelist) {
      return;
    }

    const pathname = window?.location?.pathname || "";

    const isValidPath = whitelist.some((w) => {
      try {
        const pathMatches = w === pathname;
        const regexMatches = w !== "/" && new RegExp(w).test(pathname);
        return pathMatches || regexMatches;
      } catch (e) {
        console.error(e);
        return false;
      }
    });

    if (!isValidPath) {
      this.removeRelay();
    }
  }

  private onButtonClick() {
    this.minimized ? this.unminimize() : this.minimize();
  }

  private handleMinimized(minimized: boolean) {
    this.minimized = minimized;
    this.postMessage({ action: "relayMinimized", data: minimized });
    if (!minimized) {
      this.container.classList.add(RelayScript.openClass);
      this.button.classList.add(RelayScript.openClass);
    } else {
      this.container.classList.remove(RelayScript.openClass);
      this.button.classList.remove(RelayScript.openClass);
    }
  }

  private postMessage(message: object) {
    this.container.contentWindow?.postMessage(
      message,
      RelayScript.iframeLocation
    );
  }

  private initializeRelay() {
    this.initialized = true;
    this.attachButton();
    this.sendWindowLocation();
    this.unminimizeIfRelayOpenQueryParam();

    const initializationEvent = new Event("relayInitialized");
    window?.dispatchEvent(initializationEvent);
  }

  private removeRelay() {
    this.initialized = false;
    this.detachButton();
    this.detachContainer();
  }

  private handlePathChange() {
    this.validateAgainstWhiteList();
    this.sendWindowLocation();
  }

  private sendWindowLocation() {
    this.postMessage({
      action: "windowLocation",
      data: RelayScript.getHardcodedLocation() || window?.location?.href,
    });
  }

  private unminimizeIfRelayOpenQueryParam() {
    const searchQuery = (window?.location?.search || "") as string;
    if (searchQuery.includes("relay_open")) {
      this.unminimize();
    }
  }

  private handleOpenLink(link: string, isExternal = false) {
    if (link === window?.location?.href) {
      return;
    }

    if (isExternal) {
      return window?.open(link, "_blank");
    }

    window.location.href = link;
  }

  private onReceiveMessage(event: MessageEvent) {
    if (event.origin !== RelayScript.iframeLocation) {
      return;
    }

    switch (event?.data?.action) {
      case "minimize":
        return this.minimize();
      case "openLink":
        if (event.data?.data?.href) {
          const { href, isExternal } = event.data.data;
          return this.handleOpenLink(href, isExternal !== false);
        }
        console.warn("tried to open link without an href");
      case "initialized":
        return this.initializeRelay();
      case "clearQueryParams":
        return this.clearRelayQueryParams();
    }
  }

  private addPopstateListener() {
    const boundHandlePathChange = this.handlePathChange.bind(this);
    window?.addEventListener("popstate", boundHandlePathChange);
    window?.addEventListener("beforeunload", (_event) => {
      window?.removeEventListener("popstate", boundHandlePathChange);
    });

    RelayScript.monkeyPatchHistory("pushState", boundHandlePathChange);
    RelayScript.monkeyPatchHistory("replaceState", boundHandlePathChange);
  }

  private addLoadScrollbarWidthListener() {
    window?.addEventListener("load", RelayScript.addScrollbarWidthCssVariable);
    window?.addEventListener("beforeunload", (_event) => {
      window?.removeEventListener(
        "load",
        RelayScript.addScrollbarWidthCssVariable
      );
    });
  }

  private addInnerHeightListener() {
    RelayScript.addInnerHeightCssVariable();
    window?.addEventListener("resize", RelayScript.addInnerHeightCssVariable);
    window?.addEventListener("beforeunload", (_event) => {
      window?.removeEventListener(
        "resize",
        RelayScript.addInnerHeightCssVariable
      );
    });
  }

  private addMessageListener() {
    window?.addEventListener("message", this.onReceiveMessage.bind(this));
    window?.addEventListener("beforeunload", (_event) => {
      window?.removeEventListener("message", this.onReceiveMessage.bind(this));
    });
  }

  private clearRelayQueryParams() {
    if ("URLSearchParams" in window) {
      const searchParams = new URLSearchParams(window.location.search);
      RelayScript.relayQueryKeys.forEach((key) => {
        searchParams.delete(key);
      });
      if (window?.history?.pushState) {
        const { origin, pathname } = window?.location || {};
        let searchPart = searchParams.toString();
        if (searchPart.length) {
          searchPart = `?${searchPart}`;
        }
        const newUrl = `${origin}${pathname}${searchPart}`;
        window.history.pushState({ path: newUrl }, "", newUrl);
      }
    }
  }
}

if (document?.readyState !== "loading") {
  (window as RelayWindow).relay = new RelayScript();
} else {
  document?.addEventListener("DOMContentLoaded", (_event) => {
    (window as RelayWindow).relay = new RelayScript();
  });
}
