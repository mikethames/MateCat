import React, {createContext, createRef} from 'react'
import _ from 'lodash'
import Immutable from 'immutable'
import ReactDOMServer from 'react-dom/server'
import PropTypes from 'prop-types'

import SegmentStore from '../../stores/SegmentStore'
import CommentsStore from '../../stores/CommentsStore'
import CatToolStore from '../../stores/CatToolStore'
import SegmentConstants from '../../constants/SegmentConstants'
import CatToolConstants from '../../constants/CatToolConstants'
import Speech2Text from '../../utils/speech2text'
import TagUtils from '../../utils/tagUtils'
import SegmentUtils from '../../utils/segmentUtils'
import SegmentActions from '../../actions/SegmentActions'
import RowSegment from '../common/VirtualList/Rows/RowSegment'
import VirtualList from '../common/VirtualList/VirtualList'

const ROW_HEIGHT = 90
const OVERSCAN = 5

export const SegmentsContext = createContext({})
const listRef = createRef()

class SegmentsContainer extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      rows: [],
      segments: Immutable.fromJS([]),
      splitGroup: [],
      timeToEdit: config.time_to_edit_enabled,
      scrollTo: this.props.startSegmentId,
      scrollToSelected: false,
      window: {
        width: 0,
        height: 0,
      },
      sideOpen: false,
      files: CatToolStore.getJobFilesInfo(),
    }
    this.renderSegments = this.renderSegments.bind(this)
    this.updateAllSegments = this.updateAllSegments.bind(this)
    this.splitSegments = this.splitSegments.bind(this)
    this.updateWindowDimensions = this.updateWindowDimensions.bind(this)
    this.scrollToSegment = this.scrollToSegment.bind(this)
    this.scrollToSelectedSegment = this.scrollToSelectedSegment.bind(this)
    this.openSide = this.openSide.bind(this)
    this.closeSide = this.closeSide.bind(this)
    this.recomputeListSize = this.recomputeListSize.bind(this)
    this.forceUpdateSegments = this.forceUpdateSegments.bind(this)
    this.storeJobInfo = this.storeJobInfo.bind(this)
    this.onChangeRowHeight = this.onChangeRowHeight.bind(this)

    this.lastScrollTop = 0
    this.segmentsHeightsMap = {}
    this.segmentsHeightsMapPanelClose = {}
    this.segmentsHeightsMapPanelOpen = {}
    this.segmentsWithCollectionType = []

    this.scrollContainer
    this.segmentContainerVisible = false
    this.index = this.props.startSegmentId
    this.lastOpenedHeight = '200'
    this.domContainer = document.getElementById('outer')

    this.updatedRowsHeight = []
  }

  getCachedRowsHeightBeforeStartIndex(startIndex = 0, segments) {
    return segments
      .toJS()
      .filter((segment, index) => index < startIndex)
      .map(({sid}, index) => {
        const cachedValue = this.segmentsHeightsMap[sid]
        const newHeight = !cachedValue?.height
          ? this.getSegmentDefaultHeight({
              index,
              segment: segments.get(index),
              previousSegment: index > 0 ? segments.get(index - 1) : undefined,
            })
          : cachedValue.height

        this.segmentsHeightsMap[sid] = {
          segment: segments.get(index),
          height: newHeight,
        }
        return {id: sid, height: newHeight}
      })
  }

  getRows(segments) {
    // get cached height for items before first item rendered
    const rowsBeforeStartIndex = this.lastUpdateObj?.startIndex
      ? this.getCachedRowsHeightBeforeStartIndex(
          this.lastUpdateObj.startIndex,
          this.state.segments,
        )
      : []

    return new Array(segments.size).fill({}).map((item, index) => {
      const sid = segments.get(index).get('sid')
      const cachedHeight = rowsBeforeStartIndex.find(
        ({id}) => sid === id,
      )?.height

      return {
        id: sid,
        height: cachedHeight
          ? cachedHeight
          : this.updatedRowsHeight.find(({id}) => sid === id)?.height ??
            ROW_HEIGHT,
        defaultHeight: cachedHeight ? cachedHeight : ROW_HEIGHT,
      }
    })
  }

  onChangeRowHeight(id, newHeight) {
    if (!this.updatedRowsHeight.find((row) => row.id === id))
      this.updatedRowsHeight.push({id})
    const updateHeight = (row) =>
      row.id === id
        ? {
            ...row,
            height: newHeight,
          }
        : row
    this.updatedRowsHeight = this.updatedRowsHeight.map(updateHeight)
    this.setState({
      rows: this.state.rows.map(updateHeight),
    })
  }

  splitSegments(segments, splitGroup) {
    this.setState({
      rows: this.getRows(segments),
      segments: segments,
      splitGroup: splitGroup,
    })
  }

  openSide() {
    if (!this.state.sideOpen) {
      this.segmentsHeightsMapPanelClose = {...this.segmentsHeightsMap}
      this.segmentsHeightsMap = {...this.segmentsHeightsMapPanelOpen}
      this.setState({sideOpen: true})
    }
  }

  closeSide() {
    if (this.state.sideOpen) {
      this.segmentsHeightsMapPanelOpen = {...this.segmentsHeightsMap}
      this.segmentsHeightsMap = {...this.segmentsHeightsMapPanelClose}
      this.setState({sideOpen: false})
    }
  }

  updateAllSegments() {
    this.forceUpdate()
  }

  renderSegments(segments) {
    // VirtualList.prototype.animateScroll = false;
    // Update previous last segment height inside segmentsHeightsMap

    if (this.state.segments.size !== segments.size) {
      const oldLastSegment = this.getSegmentByIndex(
        this.state.segments.size - 1,
      )
      const newLastSegment = segments.get(segments.size - 1)
      if (oldLastSegment && newLastSegment) {
        const oldLastSid = oldLastSegment.get('sid')
        const newLastSid = newLastSegment.get('sid')
        if (oldLastSid !== newLastSid && this.segmentsHeightsMap[oldLastSid]) {
          const lastHeight = this.segmentsHeightsMap[oldLastSid].height
          this.segmentsHeightsMap[oldLastSid] = {
            segment: oldLastSegment,
            height: lastHeight,
          }
        }
      }
    }

    if (this.state.guessTagEnabled !== config.tag_projection_enabled) {
      this.segmentsHeightsMap = {}
    }

    let splitGroup = []
    this.setState({
      rows: this.getRows(segments),
      segments: segments,
      splitGroup: splitGroup,
      timeToEdit: config.time_to_edit_enabled,
      guessTagEnabled: config.tag_projection_enabled,
    })
  }

  setLastSelectedSegment(sid) {
    this.lastSelectedSegment = {
      sid: sid,
    }
  }

  setBulkSelection(sid, fid) {
    if (_.isUndefined(this.lastSelectedSegment)) {
      this.lastSelectedSegment = {
        sid: sid,
      }
    }
    let from = Math.min(sid, this.lastSelectedSegment.sid)
    let to = Math.max(sid, this.lastSelectedSegment.sid)
    this.lastSelectedSegment = {
      sid: sid,
    }
    SegmentActions.setBulkSelectionInterval(from, to, fid)
  }

  scrollToSegment(sid) {
    this.lastScrolled = sid
    this.setState({scrollTo: sid, scrollToSelected: false})
    setTimeout(() => this.onScroll(), 500)
  }

  scrollToSelectedSegment(sid) {
    this.setState({scrollTo: sid, scrollToSelected: true})
    setTimeout(() => this.onScroll(), 500)
  }

  getIndexToScroll() {
    const position = this.state.scrollToSelected ? 'auto' : 'start'
    if (this.state.scrollTo && this.state.segments.size > 0) {
      const index = this.state.segments.findIndex((segment) => {
        if (this.state.scrollTo.toString().indexOf('-') === -1) {
          return parseInt(segment.get('sid')) === parseInt(this.state.scrollTo)
        } else {
          return segment.get('sid') === this.state.scrollTo
        }
      })

      let scrollTo
      if (this.state.scrollToSelected) {
        scrollTo =
          this.state.scrollTo < this.lastScrolled ? index - 1 : index + 1
        scrollTo =
          index > this.state.segments.size - 2 || index === 0 ? index : scrollTo
        this.lastScrolled = this.state.scrollTo
        return {scrollTo: scrollTo, position: position}
      }
      scrollTo = index >= 2 ? index - 2 : index === 0 ? 0 : index - 1
      scrollTo = index > this.state.segments.size - 8 ? index : scrollTo
      if (scrollTo > 0 || scrollTo < this.state.segments.size - 8) {
        //if the opened segments is too big for the view dont show the previous
        let scrollToHeight = this.getSegmentHeight(index)
        let segmentBefore1 = this.getSegmentHeight(index - 1)
        let segmentBefore2 = this.getSegmentHeight(index - 2)
        let totalHeight = segmentBefore1 + segmentBefore2 + scrollToHeight
        if (totalHeight > this.state.window.height - 50) {
          if (scrollToHeight + segmentBefore1 < this.state.window.height + 50) {
            return {scrollTo: index - 1, position: position}
          }
          return {scrollTo: index, position: position}
        }
      }
      return {scrollTo: scrollTo, position: position}
    } else if (
      this.lastListSize < this.state.segments.size &&
      this.scrollDirectionTop
    ) {
      const diff = this.state.segments.size - this.lastListSize
      return {
        scrollTo: this.lastUpdateObj.startIndex + diff,
        position: position,
      }
    }
    return {scrollTo: null, position: null}
  }

  getSegmentByIndex(index) {
    return this.state.segments.get(index)
  }

  getCollectionType(segment) {
    let collectionType
    if (segment.notes) {
      segment.notes.forEach(function (item) {
        if (item.note && item.note !== '') {
          if (item.note.indexOf('Collection Name: ') !== -1) {
            let split = item.note.split(': ')
            if (split.length > 1) {
              collectionType = split[1]
            }
          }
        }
      })
    }
    return collectionType
  }

  getSegment(segment, segImmutable, currentFileId, collectionTypeSeparator) {
    const isReviewExtended = !!this.props.isReviewExtended

    return {
      segment: segment,
      segImmutable: segImmutable,
      timeToEdit: this.state.timeToEdit,
      fid: this.props.fid,
      isReview: this.props.isReview,
      isReviewExtended: isReviewExtended,
      reviewType: this.props.reviewType,
      enableTagProjection: this.props.enableTagProjection,
      tagLockEnabled: this.state.tagLockEnabled,
      tagModesEnabled: this.props.tagModesEnabled,
      speech2textEnabledFn: Speech2Text.enabled,
      setLastSelectedSegment: this.setLastSelectedSegment.bind(this),
      setBulkSelection: this.setBulkSelection.bind(this),
      sideOpen: this.state.sideOpen,
      files: this.state.files,
      currentFileId: currentFileId.toString(),
      collectionTypeSeparator,
    }
  }

  getSegments() {
    let items = []
    let currentFileId = 0
    let collectionsTypeArray = []
    this.state.segments.forEach((segImmutable) => {
      let segment = segImmutable.toJS()
      let collectionType = this.getCollectionType(segment)
      let collectionTypeSeparator
      if (
        collectionType &&
        collectionsTypeArray.indexOf(collectionType) === -1
      ) {
        let classes = this.state.sideOpen ? 'slide-right' : ''
        const isFirstSegment =
          this.state.files && segment.sid === this.state.files[0].first_segment
        classes = isFirstSegment ? classes + ' first-segment' : classes
        collectionTypeSeparator = (
          <div
            className={'collection-type-separator ' + classes}
            key={collectionType + segment.sid + Math.random() * 10}
          >
            Collection Name: <b>{collectionType}</b>
          </div>
        )
        collectionsTypeArray.push(collectionType)
        if (this.segmentsWithCollectionType.indexOf(segment.sid) === -1) {
          this.segmentsWithCollectionType.push(segment.sid)
        }
      }
      let item = this.getSegment(
        segment,
        segImmutable,
        currentFileId,
        collectionTypeSeparator,
      )
      currentFileId = segment.id_file
      items.push(item)
    })
    return items
  }

  getCommentsPadding(index, segment) {
    if (index === 0 && this.state.sideOpen) {
      let segment1 = this.getSegmentByIndex(1)
      let segment2 = this.getSegmentByIndex(2)

      if (segment.get('openComments')) {
        let comments = CommentsStore.getCommentsBySegment(
          segment.get('original_sid'),
        )
        if (index === 0 && comments.length === 0) return 110
        else if (index === 0 && comments.length > 0) return 270
      } else if (segment1 && segment1.get('openComments')) {
        let comments = CommentsStore.getCommentsBySegment(
          segment1.get('original_sid'),
        )
        if (comments.length === 0) return 40
        else if (comments.length > 0) return 140
      } else if (segment2 && segment2.get('openComments')) {
        let comments = CommentsStore.getCommentsBySegment(
          segment2.get('original_sid'),
        )
        if (comments.length > 0) return 50
      }
    }
    return 0
  }

  getSegmentBasicSize = (index, segment) => {
    let basicSize = 0
    // if is the first segment of a file, add the 43px of the file header
    const previousFileId =
      index === 0 ? 0 : this.getSegmentByIndex(index - 1).get('id_file')
    const isFirstSegment =
      this.state.files &&
      segment.get('sid') === this.state.files[0].first_segment
    const fileDivHeight = isFirstSegment ? 60 : 75
    const collectionDivHeight = isFirstSegment ? 35 : 50
    if (previousFileId !== segment.get('id_file')) {
      basicSize += fileDivHeight
    }
    // if it's last segment, add 150px of distance from footer
    if (index === this.state.segments.size - 1) {
      basicSize += 150
    }
    // if it's collection type add 42px of header
    if (this.segmentsWithCollectionType.indexOf(segment.get('sid')) !== -1) {
      basicSize += collectionDivHeight
    }
    // add height for comments padding
    basicSize += this.getCommentsPadding(index, segment)
    return basicSize
  }

  getSegmentHeight = (index, components) => {
    return this.state.rows[index]?.height

    const segment = this.getSegmentByIndex(index)

    // --- No segment
    if (!segment) {
      return 0
    }

    segment.get('sid')

    // --- Compute basic segment size for first render
    let height = 90
    height += this.getSegmentBasicSize(index, segment)

    // --- Compute height for opened segment
    if (segment.get('opened')) {
      const $segment = $('#segment-' + segment.get('sid'))
      //  if mounted and opened
      if ($segment.length && $segment.hasClass('opened')) {
        height = $segment.outerHeight() + 20
        // add private resources div
        height = height - 23
        height += this.getSegmentBasicSize(index, segment)
        this.lastOpenedHeight = height
      } else if ($segment.length === 0 && this.lastOpenedHeight) {
        // if umounted (not visible) and cached
        height = this.lastOpenedHeight
      }

      return height
      // --- Compute real height for the first time
      // --- this computed value won't be available until next call to getSegmentHeight
    } else if (
      !this.segmentsHeightsMap[segment.get('sid')] ||
      this.segmentsHeightsMap[segment.get('sid')].height === 0
    ) {
      // if not available in cache, compute height
      if (components && Object.keys(components).length) {
        // console.time("start calc Height" + segment.get('sid'));
        const container = document.createElement('div', {})
        const html = getSegmentStructure(segment.toJS(), this.state.sideOpen)
        container.innerHTML = ReactDOMServer.renderToStaticMarkup(html)
        this.domContainer.appendChild(container)
        height = container.getElementsByTagName('section')[0].clientHeight
        this.segmentsHeightsMap[segment.get('sid')] = {
          segment: segment,
          height: height,
        }
        container.parentNode.removeChild(container)
        return height + this.getSegmentBasicSize(index, segment)
        // console.timeEnd("start calc Height" + segment.get('sid'));
      }
      // --- Retrieve height from cache
    } else {
      height =
        this.segmentsHeightsMap[segment.get('sid')].height +
        this.getSegmentBasicSize(index, segment)
    }
    return height
  }

  getSegmentDefaultHeight({index, segment, previousSegment}) {
    console.log('----> get height', segment.get('sid'))
    const container = document.createElement('div', {})
    const html = getSegmentStructure(segment.toJS(), this.state.sideOpen)
    container.innerHTML = ReactDOMServer.renderToStaticMarkup(html)
    this.domContainer.appendChild(container)
    const height = container.getElementsByTagName('section')[0].clientHeight
    container.parentNode.removeChild(container)

    const getBasicSize = ({index, segment, previousSegment}) => {
      let basicSize = 0
      // if is the first segment of a file, add the 43px of the file header
      const previousFileId = previousSegment
        ? previousSegment.get('id_file')
        : 0
      const isFirstSegment =
        this.state.files &&
        segment.get('sid') === this.state.files[0].first_segment
      const fileDivHeight = isFirstSegment ? 60 : 75
      const collectionDivHeight = isFirstSegment ? 35 : 50
      if (previousFileId !== segment.get('id_file')) {
        basicSize += fileDivHeight
      }
      // if it's last segment, add 150px of distance from footer
      if (index === this.state.segments.size - 1) {
        basicSize += 150
      }
      // if it's collection type add 42px of header
      if (this.segmentsWithCollectionType.indexOf(segment.get('sid')) !== -1) {
        basicSize += collectionDivHeight
      }
      // add height for comments padding
      basicSize += this.getCommentsPadding(index, segment)
      return basicSize
    }

    return height + getBasicSize({index, segment, previousSegment})
  }

  onScroll() {
    let scrollTop = this.scrollContainer.scrollTop()
    let scrollBottom =
      this.scrollContainer.prop('scrollHeight') -
      (scrollTop + this.scrollContainer.height())
    this.scrollDirectionTop = scrollTop < this.lastScrollTop
    if (scrollBottom < 700 && !this.scrollDirectionTop) {
      UI.getMoreSegments('after')
    } else if (scrollTop < 500 && this.scrollDirectionTop) {
      UI.getMoreSegments('before')
    }
    this.lastListSize = this.state.segments.size
    this.lastScrollTop = scrollTop
  }

  recomputeListSize(idFrom) {
    const index = this.state.segments.findIndex((segment) => {
      return segment.get('sid') === idFrom
    })
    this.segmentsHeightsMap[idFrom]
      ? (this.segmentsHeightsMap[idFrom].height = 0)
      : null
    // this.listRef.recomputeSizes(index)
    this.forceUpdate()
  }

  forceUpdateSegments(segments) {
    this.setState({
      rows: this.getRows(segments),
      segments: segments,
      splitGroup: splitGroup,
    })
    this.forceUpdate()
  }

  storeJobInfo(files) {
    this.setState({
      files: files,
    })
  }

  componentDidMount() {
    this.updateWindowDimensions()
    this.scrollContainer = $('.article-segments-container > div')
    window.addEventListener('resize', this.updateWindowDimensions)
    SegmentStore.addListener(
      SegmentConstants.RENDER_SEGMENTS,
      this.renderSegments,
    )
    SegmentStore.addListener(
      SegmentConstants.UPDATE_ALL_SEGMENTS,
      this.updateAllSegments,
    )
    SegmentStore.addListener(
      SegmentConstants.SCROLL_TO_SEGMENT,
      this.scrollToSegment,
    )
    SegmentStore.addListener(
      SegmentConstants.SCROLL_TO_SELECTED_SEGMENT,
      this.scrollToSelectedSegment,
    )
    SegmentStore.addListener(SegmentConstants.OPEN_SIDE, this.openSide)
    SegmentStore.addListener(SegmentConstants.CLOSE_SIDE, this.closeSide)

    SegmentStore.addListener(
      SegmentConstants.RECOMPUTE_SIZE,
      this.recomputeListSize,
    )
    SegmentStore.addListener(
      SegmentConstants.FORCE_UPDATE,
      this.forceUpdateSegments,
    )
    CatToolStore.addListener(
      CatToolConstants.STORE_FILES_INFO,
      this.storeJobInfo,
    )
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateWindowDimensions)
    SegmentStore.removeListener(
      SegmentConstants.RENDER_SEGMENTS,
      this.renderSegments,
    )
    SegmentStore.removeListener(
      SegmentConstants.UPDATE_ALL_SEGMENTS,
      this.updateAllSegments,
    )
    SegmentStore.removeListener(
      SegmentConstants.SCROLL_TO_SEGMENT,
      this.scrollToSegment,
    )
    SegmentStore.removeListener(
      SegmentConstants.SCROLL_TO_SELECTED_SEGMENT,
      this.scrollToSelectedSegment,
    )
    SegmentStore.removeListener(SegmentConstants.OPEN_SIDE, this.openSide)
    SegmentStore.removeListener(SegmentConstants.CLOSE_SIDE, this.closeSide)

    SegmentStore.removeListener(
      SegmentConstants.RECOMPUTE_SIZE,
      this.recomputeListSize,
    )
    SegmentStore.addListener(
      SegmentConstants.FORCE_UPDATE,
      this.forceUpdateSegments,
    )

    CatToolStore.removeListener(
      CatToolConstants.STORE_FILES_INFO,
      this.storeJobInfo,
    )
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (
      !nextState.segments.equals(this.state.segments) ||
      nextState.splitGroup !== this.state.splitGroup ||
      nextState.tagLockEnabled !== this.state.tagLockEnabled ||
      nextState.window !== this.state.window ||
      (nextState.scrollTo && nextState.scrollTo !== this.state.scrollTo) ||
      nextState.sideOpen !== this.state.sideOpen ||
      nextState.rows !== this.state.rows
    )
  }

  updateWindowDimensions() {
    let data = {}

    data.width = window.innerWidth
    data.height =
      window.innerHeight - $('header').innerHeight() - $('footer').innerHeight()

    if (
      this.state.window.width !== data.width ||
      this.state.window.height !== data.height
    ) {
      this.setState({
        window: data,
        ...(this.state.window.width !== data.width && {
          rows: this.getRows(this.state.segments),
        }),
      })
      this.segmentsHeightsMap = {}
      this.segmentsHeightsMapPanelClose = {}
      this.segmentsHeightsMapPanelOpen = {}
    }
  }

  componentDidCatch(e) {
    console.log('React component Error', e)
  }

  componentDidUpdate() {
    this.lastListSize = this.state.segments.size
    if (this.state.scrollTo !== null && this.state.segments.size > 0) {
      setTimeout(() => {
        this.setState({
          scrollTo: null,
          scrollToSelected: false,
        })
      })
    }
    this.segmentContainerVisible = false
  }

  render() {
    const scrollToObject = this.getIndexToScroll()
    const segmentsProps = this.getSegments()
    // set list items
    const items = this.state.rows.map((row) => ({
      ...row,
      ...segmentsProps.find(({segment}) => segment.sid === row.id),
    }))
    return (
      <SegmentsContext.Provider
        value={{onChangeRowHeight: this.onChangeRowHeight}}
      >
        <VirtualList
          ref={listRef}
          items={items}
          scrollToIndex={{
            value: scrollToObject.scrollTo,
            align: scrollToObject.position,
          }}
          overscan={OVERSCAN}
          onScroll={() => this.onScroll()}
          Component={RowSegment}
          itemStyle={({segment}) => segment.opened && {zIndex: 1}}
          width={this.state.window.width}
          height={this.state.window.height}
          renderedRange={(range) =>
            (this.lastUpdateObj = {
              startIndex: range[0],
              stopIndex: range[range.length - 1],
            })
          }
        />
      </SegmentsContext.Provider>
    )
  }
}

SegmentsContainer.propTypes = {
  segments: PropTypes.array,
  splitGroup: PropTypes.array,
  timeToEdit: PropTypes.string,
}

SegmentsContainer.defaultProps = {
  segments: [],
  splitGroup: [],
  timeToEdit: '',
}

const getSegmentStructure = (segment, sideOpen) => {
  let source = segment.segment
  let target = segment.translation
  if (SegmentUtils.checkCurrentSegmentTPEnabled(segment)) {
    source = TagUtils.removeAllTags(source)
    target = TagUtils.removeAllTags(target)
  }

  source = TagUtils.matchTag(
    TagUtils.decodeHtmlInTag(
      TagUtils.decodePlaceholdersToTextSimple(source),
      config.isSourceRTL,
    ),
  )
  target = TagUtils.matchTag(
    TagUtils.decodeHtmlInTag(
      TagUtils.decodePlaceholdersToTextSimple(target),
      config.isSourceRTL,
    ),
  )

  return (
    <section
      className={`status-draft ${sideOpen ? 'slide-right' : ''}`}
      ref={(section) => (this.section = section)}
    >
      <div className="sid">
        <div className="txt">0000000</div>
        <div className="txt segment-add-inBulk">
          <input type="checkbox" />
        </div>
        <div className="actions">
          <button className="split" title="Click to split segment">
            <i className="icon-split"> </i>
          </button>
          <p className="split-shortcut">CTRL + S</p>
        </div>
      </div>

      <div className="body">
        <div className="header toggle"> </div>
        <div
          className="text segment-body-content"
          style={{boxSizing: 'content-box'}}
        >
          <div className="wrap">
            <div className="outersource">
              <div
                className="source item"
                tabIndex="0"
                dangerouslySetInnerHTML={{__html: source}}
              />
              <div className="copy" title="Copy source to target">
                <a href="#"> </a>
                <p>CTRL+I</p>
              </div>
              <div className="target item">
                <div className="textarea-container">
                  <div
                    className="targetarea editarea"
                    spellCheck="true"
                    dangerouslySetInnerHTML={{__html: target}}
                  />
                  <div className="toolbar">
                    <a
                      className="revise-qr-link"
                      title="Segment Quality Report."
                      target="_blank"
                      href="#"
                    >
                      QR
                    </a>
                    <a
                      href="#"
                      className="tagModeToggle "
                      title="Display full/short tags"
                    >
                      <span className="icon-chevron-left"> </span>
                      <span className="icon-tag-expand"> </span>
                      <span className="icon-chevron-right"> </span>
                    </a>
                    <a
                      href="#"
                      className="autofillTag"
                      title="Copy missing tags from source to target"
                    >
                      {' '}
                    </a>
                    <ul className="editToolbar">
                      <li className="uppercase" title="Uppercase">
                        {' '}
                      </li>
                      <li className="lowercase" title="Lowercase">
                        {' '}
                      </li>
                      <li className="capitalize" title="Capitalized">
                        {' '}
                      </li>
                    </ul>
                  </div>
                </div>
                <p className="warnings"> </p>
                <ul className="buttons toggle">
                  <li>
                    <a href="#" className="translated">
                      {' '}
                      Translated{' '}
                    </a>
                    <p>CTRL ENTER</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="status-container">
            <a href="#" className="status no-hover">
              {' '}
            </a>
          </div>
        </div>
        <div className="timetoedit" data-raw-time-to-edit="0">
          {' '}
        </div>
        <div className="edit-distance">Edit Distance:</div>
      </div>
      <div className="segment-side-buttons">
        <div
          data-mount="translation-issues-button"
          className="translation-issues-button"
        >
          {' '}
        </div>
      </div>
      <div className="segment-side-container"> </div>
    </section>
  )
}

export default SegmentsContainer
