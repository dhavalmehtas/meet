import GridView from './gridView'
import JitsiConferenceManager from '../../lib/jitsiManager/jitsiConferenceManager'
import React from 'react'
import SpotlightView from './spotlightView'
import VideoChatControls from './controls/videoChatControls'
import { observer } from 'mobx-react'
import { bind } from 'lodash-decorators'
import debounce from 'lodash/debounce'

interface VideoChatProps {
  conference: JitsiConferenceManager;
  onLeave(): void;
}

interface VideoChatState {
  view: string;
  crop: boolean;
  autoSwitchView: boolean;
}

@observer
export default class VideoChat extends React.Component<VideoChatProps, VideoChatState> {
  private autoSwitchViewDebounced: () => void

  constructor (props: VideoChatProps) {
    super(props)

    this.autoSwitchViewDebounced = debounce(this.autoSwitchView, 200)

    // TODO: these are dangerous because they trigger double renders
    this.props.conference.on(JitsiConferenceManager.events.PARTICIPANT_JOINED, this.autoSwitchView)
    this.props.conference.on(JitsiConferenceManager.events.PARTICIPANT_LEFT, this.autoSwitchView)

    window.addEventListener('resize', this.autoSwitchViewDebounced)

    this.state = {
      view: 'spotlight',
      crop: true,
      autoSwitchView: true
    }
  }

  componentWillUnmount () {
    this.props.conference.off(JitsiConferenceManager.events.PARTICIPANT_JOINED, this.autoSwitchView)
    this.props.conference.off(JitsiConferenceManager.events.PARTICIPANT_LEFT, this.autoSwitchView)
    window.removeEventListener('resize', this.autoSwitchViewDebounced)
  }

  @bind()
  autoSwitchView () {
    if (this.state.autoSwitchView) {
      const { conference } = this.props
      let { view, crop } = this.state
      const width = document.documentElement.offsetWidth

      if (conference.participants.length >= 2) {
        view = 'grid'
        crop = width < 960
      } else {
        view = 'spotlight'
        crop = true
      }

      this.setState({ view, crop })
    }
  }

  @bind()
  handleViewChange (view: string) {
    // Always zoom spotlight view
    const crop = view === 'spotlight'
    const autoSwitchView = false

    this.setState({ view: view, crop, autoSwitchView })
  }

  render () {
    const conference = this.props.conference
    const { localParticipant, participants, status } = conference

    return (status === 'joined' && localParticipant) ? (
      <div className='videoChat'>
        <header>
          <h1>bipbop</h1>
        </header>
        {this.state.view === 'spotlight' &&
          <SpotlightView 
            conference={conference}
            localParticipant={localParticipant}
            participants={participants}
            crop={this.state.crop}
          />
        }
        {this.state.view === 'grid' &&
          <GridView 
            conference={this.props.conference} 
            localParticipant={localParticipant}
            participants={participants}
            crop={this.state.crop} 
          />
        }
        <VideoChatControls
          localParticipant={localParticipant}
          view={this.state.view}
          onLeave={this.props.onLeave}
          onViewChange={this.handleViewChange}
          />
      </div>
    ) : null
  }
}
