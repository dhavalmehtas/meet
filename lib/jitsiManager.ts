/* global JitsiMeetJS */
import { bind } from "lodash-decorators";
import { observable } from "mobx";
import JitsiConferenceManager from "./jitsiManager/jitsiConferenceManager";
import events from "events";

export default class JitsiManager extends events.EventEmitter {
  static events = {
    CONNECTION_DISCONNECTED: "CONNECTION_DISCONNECTED",
    CONNECTION_ESTABLISHED: "CONNECTION_ESTABLISHED",
    CONNECTION_FAILED: "CONNECTION_FAILED"
  };

  domain: string;
  region: string;
  conferenceManagers: JitsiConferenceManager[] = [];
  connection: JitsiMeetJS.JitsiConnection;
  @observable status = "disconnected";

  constructor(domain: string, region: string) {
    super();

    this.domain = domain;
    this.region = region;

    this.initJitsiMeetJS();

    this.connection = new JitsiMeetJS.JitsiConnection(undefined, undefined, {
      hosts: {
        domain: domain,
        muc: `conference.${domain}`
      },
      serviceUrl: `https://${domain}/http-bind`,
      clientNode: "https://bipbop.me/JitsiMeetJS"
    });
  }

  connect(): void {
    this.addEventListeners();

    this.status = "connecting";
    this.connection.connect();
  }

  disconnect(): void {
    this.status = "disconnecting";
    // Helps with cleanup
    this.connection.disconnect();

    // Handlers are disposed of in handleConnectionDisconnected
  }

  initConferenceManager(
    id: string,
    localTracks: JitsiMeetJS.JitsiTrack[],
    displayName: string | undefined
  ): JitsiConferenceManager {
    const conferenceManager = new JitsiConferenceManager(this, id, localTracks, displayName);
    this.conferenceManagers.push(conferenceManager);

    return conferenceManager;
  }

  private initJitsiMeetJS(): void {
    JitsiMeetJS.init({ useIPv6: true, disableAudioLevels: true, disableThirdPartyRequests: true });
    JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.INFO);
  }

  private addEventListeners(): void {
    this.connection.addEventListener(
      JitsiMeetJS.events.connection.CONNECTION_FAILED,
      this.handleConnectionFailed
    );
    this.connection.addEventListener(
      JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
      this.handleConnectionEstablished
    );
    this.connection.addEventListener(
      JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
      this.handleConnectionDisconnected
    );
    this.connection.addEventListener(
      JitsiMeetJS.events.connection.WRONG_STATE,
      this.handleWrongState
    );
  }

  private removeEventListeners(): void {
    this.connection.removeEventListener(
      JitsiMeetJS.events.connection.CONNECTION_FAILED,
      this.handleConnectionFailed
    );
    this.connection.removeEventListener(
      JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
      this.handleConnectionEstablished
    );
    this.connection.removeEventListener(
      JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
      this.handleConnectionDisconnected
    );
    this.connection.removeEventListener(
      JitsiMeetJS.events.connection.WRONG_STATE,
      this.handleWrongState
    );
  }

  @bind()
  private handleConnectionFailed(): void {
    this.status = "failed";
    this.emit(JitsiManager.events.CONNECTION_FAILED);
  }

  @bind()
  private handleConnectionEstablished(): void {
    this.status = "connected";
    this.emit(JitsiManager.events.CONNECTION_ESTABLISHED);
  }

  @bind()
  private handleConnectionDisconnected(): void {
    this.status = "disconnected";
    this.emit(JitsiManager.events.CONNECTION_DISCONNECTED);

    this.removeEventListeners();
  }

  @bind()
  private handleWrongState(): void {
    console.warn("Action can't be executed because the connection is in wrong state.");
  }
}
