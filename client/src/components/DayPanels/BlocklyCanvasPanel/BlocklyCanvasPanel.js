import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Link} from "react-router-dom";
import '../DayPanels.less'
import {compileArduinoCode, setLocalSandbox, handleSave} from "../helpers";
import {message} from "antd";
import {getSaves} from "../../../Utils/requests";
import CodeModal from "./CodeModal";
import VersionHistoryModal from "./VersionHistoryModal"

export default function BlocklyCanvasPanel(props) {
    const [hoverXml, setHoverXml] = useState(false);
    const [hoverArduino, setHoverArduino] = useState(false);
    const [hoverCompile, setHoverCompile] = useState(false);
    const [saves, setSaves] = useState({});
    const [lastSavedTime, setLastSavedTime] = useState(null);
    const [, updateState] = useState(null);
    const [lastAutoSave, setLastAutoSave] = useState(null);
    const {day, isSandbox, homePath, handleGoBack, isStudent, lessonName} = props;

    const workspaceRef = useRef(null);
    const dayRef = useRef(null);

    const setWorkspace = () =>
        workspaceRef.current = window.Blockly.inject('blockly-canvas',
            {toolbox: document.getElementById('toolbox')}
        );

    const loadSave = selectedSave => {
        try {
            let toLoad = day.template;
            if (selectedSave !== -1) {

                if (saves.current && saves.current.id === selectedSave) {
                    toLoad = saves.current.workspace;
                    setLastSavedTime(getFormattedDate(saves.current.updated_at));
                } else {
                    const s = saves.past.find(save => save.id === selectedSave);
                    if (s) {
                        toLoad = s.workspace;
                        setLastSavedTime(getFormattedDate(s.updated_at))
                    } else {
                        message.error('Failed to restore save.')
                        return
                    }
                }
            } else {
                setLastSavedTime(null)
            }
            let xml = window.Blockly.Xml.textToDom(toLoad);
            if (workspaceRef.current) workspaceRef.current.clear();
            window.Blockly.Xml.domToWorkspace(xml, workspaceRef.current);
            workspaceRef.current.clearUndo()
        } catch (e) {
            message.error('Failed to load save.')
        }
    };

    useEffect(() => {
        // automatically save workspace every min
        setInterval(async () => {
            if (isStudent && workspaceRef.current && dayRef.current) {
                const res = await handleSave(dayRef.current.id, workspaceRef);
                if (res.data) {
                    setLastAutoSave(res.data[0]);
                    setLastSavedTime(getFormattedDate(res.data[0].updated_at))
                }
            }
        }, 60000);
    }, [isStudent]);

    useEffect(() => {
        // clean up - saves workspace and removes blockly div from DOM
        return async () => {
            if (isStudent && dayRef.current && workspaceRef.current)
                await handleSave(dayRef.current.id, workspaceRef);
            if (workspaceRef.current) workspaceRef.current.dispose();
            dayRef.current = null
        }
    }, [isStudent]);

    const forceUpdate = useCallback(() => updateState({}), []);

    const onWorkspaceChange = useCallback(() => {
        // set updated workspace as local sandbox
        if (isSandbox) setLocalSandbox(workspaceRef.current);
        // force update to properly render undo button state
        if (isSandbox || isStudent) forceUpdate()
    }, [isSandbox, isStudent, forceUpdate]);

    useEffect(() => {
        // once the day state is set, set the workspace and save
        const setUp = async () => {
            dayRef.current = day;
            if (!workspaceRef.current && day && Object.keys(day).length !== 0) {
                setWorkspace();

                let onLoadSave = null;
                if (isStudent) {
                    const res = await getSaves(day.id);
                    if (res.data) {
                        if (res.data.current) onLoadSave = res.data.current;
                        setSaves(res.data)
                    } else {
                        console.log(res.err)
                    }
                }

                if (onLoadSave) {
                    let xml = window.Blockly.Xml.textToDom(onLoadSave.workspace);
                    window.Blockly.Xml.domToWorkspace(xml, workspaceRef.current);
                    setLastSavedTime(getFormattedDate(onLoadSave.updated_at));
                } else if (day.template) {
                    let xml = window.Blockly.Xml.textToDom(day.template);
                    window.Blockly.Xml.domToWorkspace(xml, workspaceRef.current)
                }

                await workspaceRef.current.addChangeListener(onWorkspaceChange);
                workspaceRef.current.clearUndo()
            }
        };
        setUp()
    }, [day, isStudent, onWorkspaceChange]);

    const handleManualSave = async () => {
        // save workspace then update load save options
        const res = await handleSave(day.id, workspaceRef);
        if (res.err) {
            message.error(res.err)
        } else {
            setLastSavedTime(getFormattedDate(res.data[0].updated_at));
            message.success('Workspace saved successfully.')
        }

        const savesRes = await getSaves(day.id);
        if (savesRes.data) setSaves(savesRes.data);
    };

    const handleUndo = () => {
        if (workspaceRef.current.undoStack_.length > 0)
            workspaceRef.current.undo(false)
    };

    const handleRedo = () => {
        if (workspaceRef.current.redoStack_.length > 0)
            workspaceRef.current.undo(true)
    };

    const getFormattedDate = dt => {
        const d = new Date(Date.parse(dt));
        const day = d.getDate();
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        let hrs = d.getHours();
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        hrs = hrs % 12;
        hrs = hrs ? hrs : 12;
        let min = d.getMinutes();
        min = min < 10 ? '0' + min : min;
        let sec = d.getSeconds();
        sec = sec < 10 ? '0' + sec : sec;
        return `${month}/${day}/${year}, ${hrs}:${min}:${sec} ${ampm}`
    };

    return (
        <div id='horizontal-container' className="flex flex-column">
            <div id='top-container' className="flex flex-column vertical-container">
                <div id='description-container' className="flex flex-row space-between card">
                    <div className='flex flex-row'>
                        {homePath ? <Link id='link' to={homePath} className="flex flex-column">
                            <i className="fa fa-home"/>
                        </Link> : null}
                        {handleGoBack ? <button onClick={handleGoBack} id='link' className="flex flex-column">
                            <i id='icon-btn' className="fa fa-arrow-left"/>
                        </button> : null}
                    </div>
                    <div>
                        {isStudent && lastSavedTime ?
                            `Last changes saved ${lastSavedTime}`
                            : null
                        }
                    </div>
                    <div className='flex flex-row'>
                        {isStudent ?
                            <div className='flex flex-row'>
                                <VersionHistoryModal
                                    saves={saves}
                                    lastAutoSave={lastAutoSave}
                                    defaultTemplate={day}
                                    getFormattedDate={getFormattedDate}
                                    loadSave={loadSave}
                                />
                                <button onClick={handleManualSave} id='link' className="flex flex-column">
                                    <i id='icon-btn' className="fa fa-save"/>
                                </button>
                            </div>
                            : null
                        }
                        {isStudent || isSandbox ?
                            <div className='flex flex-row'>
                                <button onClick={handleUndo} id='link' className="flex flex-column">
                                    <i id='icon-btn' className="fa fa-undo-alt"
                                       style={workspaceRef.current ?
                                           workspaceRef.current.undoStack_.length < 1 ?
                                               {color: 'grey', cursor: 'default'} : null
                                           : null}
                                    />
                                </button>
                                <button onClick={handleRedo} id='link' className="flex flex-column">
                                    <i id='icon-btn' className="fa fa-redo-alt"
                                       style={workspaceRef.current ?
                                           workspaceRef.current.redoStack_.length < 1 ?
                                               {color: 'grey', cursor: 'default'} : null
                                           : null}
                                    />
                                </button>
                            </div>
                            : null}
                    </div>
                    <div style={{"width": "10%"}}>
                        <div id='action-btn-container' className="flex space-between">
                            {!isStudent ?
                                <CodeModal
                                    title={'XML'}
                                    workspaceRef={workspaceRef.current}
                                    setHover={setHoverXml}
                                    hover={hoverXml}
                                />
                                : null}
                            <CodeModal
                                title={'Arduino Code'}
                                workspaceRef={workspaceRef.current}
                                setHover={setHoverArduino}
                                hover={hoverArduino}
                            />
                            <i onClick={() => compileArduinoCode(workspaceRef.current)}
                               className="fas fa-upload hvr-info"
                               onMouseEnter={() => setHoverCompile(true)}
                               onMouseLeave={() => setHoverCompile(false)}/>
                            {hoverCompile && <div className="popup Compile">Upload to Arduino</div>}
                        </div>
                    </div>
                </div>
            </div>
            <div id='bottom-container' className="flex flex-column vertical-container overflow-visible">
                <div id="section-header">
                    {lessonName ? lessonName : "Program your Arduino..."}
                </div>
                <div id="blockly-canvas"
                     onChange={() => setLocalSandbox(workspaceRef.current)}/>
            </div>

            {/* This xml is for the blocks' menu we will provide. Here are examples on how to include categories and subcategories */}
            <xml id="toolbox" style={{"display": "none"}} is="Blockly workspace">
                {
                    // Maps out block categories
                    day && day.toolbox && day.toolbox.map(([category, blocks]) => (
                        <category name={category} is="Blockly category" key={category}>
                            {
                                // maps out blocks in category
                                // eslint-disable-next-line
                                blocks.map((block) => {
                                    return <block type={block.name} is="Blockly block" key={block.name}/>
                                })
                            }
                        </category>
                    ))
                }
            </xml>
        </div>
    )
}
