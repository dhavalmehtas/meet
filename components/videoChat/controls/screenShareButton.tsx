/* global JitsiMeetJS */
import { Button } from "antd";
import { DesktopOutlined, StopOutlined } from "@ant-design/icons";
import { bind } from "lodash-decorators";
import { matopush } from "../../../lib/matomo";
import JitsiParticipant from "../../../lib/jitsiManager/jitsiParticipant";
import React from "react";
import localforage from "localforage";

interface ScreenShareButtonProps {
  localParticipant: JitsiParticipant;
}

interface ScreenShareButtonState {
  shared: boolean;
}

export default class ScreenShareButton extends React.Component<
  ScreenShareButtonProps,
  ScreenShareButtonState
> {
  state = {
    shared: false
  };

  @bind()
  async handleClick(): Promise<void> {
    // Toggle muted
    const shared = !this.state.shared;
    const { localParticipant } = this.props;

    // Clear previous event listeners
    localParticipant.videoTrack?.removeEventListener(
      JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
      this.handleClick
    );

    const options: JitsiMeetJS.CreateLocalTracksOptions = { devices: [] };

    if (shared) {
      options.devices = ["desktop"];
    } else {
      options.devices = ["video"];
      options.cameraDeviceId = await localforage.getItem("selectedVideoInputID");
    }

    try {
      const tracks = await JitsiMeetJS.createLocalTracks(options);
      const videoTrack = tracks[0];

      // Watch for the track to be stopped via other browser UI
      if (shared) {
        // Treat closes from the browser as a click on the button
        videoTrack.addEventListener(
          JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
          this.handleClick,
          { once: true }
        );
      }

      await localParticipant.replaceVideoTrack(videoTrack);

      // Flip the state
      this.setState({ shared });
    } catch (error) {
      console.warn(error);

      // Flip the state back
      this.setState({ shared: !shared });
    }

    matopush(["trackEvent", "videoChat", "screenShareButton", "toggle"]);
  }

  render(): JSX.Element {
    return (
      <div
        className={`button screenShareButton ${this.state.shared ? "shared" : ""}`}
        onClick={this.handleClick}
      >
        {!this.state.shared && (
          <Button size="large" shape="round" icon={<DesktopOutlined />}>
            Share screen
          </Button>
        )}
        {this.state.shared && (
          <Button size="large" shape="round" icon={<StopOutlined />} type="primary">
            Stop sharing
          </Button>
        )}
      </div>
    );
  }
}
