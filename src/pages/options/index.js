import React, { Component } from 'react'
import { Card, Elevation, Icon, Button, Popover, Menu, MenuItem, Tag } from '@blueprintjs/core'
import posed, { PoseGroup } from 'react-pose'
import clsx from 'classnames'
import { renderReactComponent } from '~mixins/utils'
import { request } from '~mixins'


import './_options.sass'

import { InteractiveCard } from '~components/cards'

function drawCartography (points, container) {
  // Coordinates of points on the map.

  // Assign additional properties to some of the points.
  // These could of course be defined directly in the data above,
  // we use the loop to avoid repetition.
  const red = [200, 0, 0, 255];
  points.forEach(function (p, index) {
    // Elevation of the point on the 0..1 scale.
    // Zero elevation will not contribute to the height map,
    // but may still display markers or labels, if defined.
    p.elevation = index === 0 ? 1 : 0.2;

    // To display a marker, the point must have a non-empty "marker" property.
    // The property defines shape of the marker: "circle", "square", "triangle".
    p.marker = "circle";

    // Marker size on the 0..1 scale. Zero marker size will draw markers
    // of very small sizes, near to 1 pixel. This might be useful for
    // drawing hundreds of thousands of markers.
    p.markerSize = 0;

    // Color of the marker. The required format is a 4-element RGBA array,
    // with each component value in the 0..255 range.
    // Tip: you can reuse array references for same-colored markers.
    p.markerColor = red;
  });

  // Define layers.

  // Currently, the elevations layer is special: this is the only layer that can define
  // point elevations and labels. Bounding box of the map and hover events are computed
  // only for points on this layer. The special status is likely to be removed before
  // the first official release.
  const elevations = { points: points };

  // Point markers layer, draws point markers (circles in this example) on top
  // of the elevation layer. The markerSizeMultiplier defines how large in pixels
  // a marker with markerSize = 1 should be.
  const markers =    { points: points, type: "marker", markerSizeMultiplier: 10 };

  // Initialize dotAtlas
  const dotatlas = new DotAtlas({
    element: container,
    pixelRatio: window.devicePixelRatio || 1,
    maxRadiusDivider: 10,
    mapLightAzimuth: 0.4,
    mapLightIntensity: 0.5,
  });

  const dataObject = {
    layers: [
      elevations, // Currently, elevation layer must always be at index 0
      // markers,
    ]
  }
  const dotatlasFx = new DotAtlasEffects(dotatlas)

  dotatlasFx.rollout(dataObject)

  return { map: dotatlas, fx: dotatlasFx, data: dataObject };
}


const CardBox = posed.div({
  init: {
    width: 'auto',
    height: 'auto',
    position: 'static',
    flip: true,
    // staggerChildren: 100,
    // delay: 100,
  },
  zoomed: {
    position: 'fixed',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    flip: true,
    // staggerChildren: 100,
    transition: {
      // type: 'spring',
      duration: 100,
    },
    // delay: 300,
  },
})

const InfoCard = posed.li()


class MapCard extends Component {
  constructor (props) {
    super(props)
    this.state = {
      pose: 'init',
      atlasReady: false,
      fakeTags: [],
    }

    this.canvasRef = React.createRef()
    this.didToggleZoom = this.didToggleZoom.bind(this)
    this.refreshAtlas = this.refreshAtlas.bind(this)
    this.updateAtlas = this.updateAtlas.bind(this)
  }

  componentDidMount () {
    request({ url: 'http://glacier.zen.noop.pw/etc/vismodel.json' })
      .then((points) => {
        this.setState({ atlasReady: true, fakeTags: ['Boop', 'Noot', 'BMO'] })
        this.atlas = drawCartography(points, this.canvasRef)
      })
  }

  didToggleZoom () {
    const pose = this.state.pose === 'zoomed' ? 'init' : 'zoomed'

    // this.atlas.fx.pullback().then(() => {
    // })
    // this.setState({ pose })

    this.setState({ atlasReady: false }, () => this.setState({ pose }))
  }

  refreshAtlas () {
    this.atlas.map.resize()
    this.atlas.fx.rollout(this.atlas.data)
    this.setState({ atlasReady: true })
    // this.atlas.resize()
  }

  updateAtlas ({ key, value }) {
    this.atlas.set(key, value)
    this.atlas.redraw()
  }

  render () {
    return (
      <div className='map-card-container'>
        <CardBox pose={this.state.pose} onPoseComplete={this.refreshAtlas}>
          <Card elevation={Elevation.FOUR} className='map-card'>
            <div className='header'>
              <h3>Your Knowledge Map</h3>
              <div className='tools'>
                <Button
                  icon={this.state.pose == 'init' ? 'maximize' : 'minimize' }
                  minimal
                  onClick={this.didToggleZoom}
                />
                <Popover usePortal={true} position='bottom-right'>
                  <Button icon='more' minimal/>
                  <Menu>
                    <MenuItem text='Customize' icon=''/>
                    <MenuItem text='Option'/>
                  </Menu>
                </Popover>
              </div>
            </div>

            <ul className='contents'>
              <PoseGroup animateOnMount={true}>
                {this.state.fakeTags.map((id) => {
                  return (
                    <InfoCard key={id}>
                      <Tag>{id}</Tag>
                    </InfoCard>
                  )
                })}
              </PoseGroup>
            </ul>

            <div
              className={clsx('mapbox', { loading: !this.state.atlasReady })}
              ref={(el) => this.canvasRef = el}
            />

          </Card>
        </CardBox>
      </div>
    )
  }
}

window.addEventListener('load', () => {
  // const mountroot = document.getElementById('cartography')
  renderReactComponent('cartography', MapCard)
})
