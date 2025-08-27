import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import ReactModal from 'react-modal';
import VM from '@scratch/scratch-vm';
import { LegacyStorage } from '../../lib/legacy-storage';
import AudioEngine from 'scratch-audio';
import { BitmapAdapter } from '@scratch/scratch-svg-renderer';
import ScratchRender from '@scratch/scratch-render';
import * as ProjectManager from '../../lib/project-management';

import styles from './player-modal.css';
import closeIcon from '../projects-modal/icons/icon--close.svg';

const PlayerModal = ({
    isOpen,
    onClose,
    projectId
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [projectTitle, setProjectTitle] = useState('');
    const [projectLoaded, setProjectLoaded] = useState(false);
    
    // Refs
    const vmRef = useRef(null);
    const canvasRef = useRef(null);
    const rendererRef = useRef(null);
    const animationFrameRef = useRef(null);
    
    // Get project title when modal opens
    useEffect(() => {
        if (isOpen && projectId) {
            // Get project title first for user experience
            ProjectManager.fetchProjectMetadata(projectId)
                .then(metadata => {
                    setProjectTitle(metadata.title || 'Untitled Project');
                })
                .catch(err => {
                    console.error('Error fetching project title:', err);
                    setProjectTitle('Untitled Project');
                });
        }
    }, [isOpen, projectId]);
    
    
    // Setup renderer when canvas is available
    useEffect(() => {
        if (!isOpen || !canvasRef.current) return;
        
        try {
            // Make sure the canvas is properly sized
            if (canvasRef.current) {
                canvasRef.current.width = 720;
                canvasRef.current.height = 540;
            }
            
            console.log('Canvas ready:', 
                canvasRef.current instanceof HTMLCanvasElement,
                canvasRef.current.width, 
                canvasRef.current.height);
            // Create a clean VM instance
            const vm = new VM();
            vmRef.current = vm;
            
            // Setup Storage
            const storageConfig = new LegacyStorage();
            const storage = storageConfig.scratchStorage;
            vm.attachStorage(storage);
            
            // Setup Audio Engine
            const audioEngine = new AudioEngine();
            vm.attachAudioEngine(audioEngine);
            
            // Setup SVG Renderer
            vm.attachV2BitmapAdapter(new BitmapAdapter());
            
            // Initialize VM
            vm.setCompatibilityMode(false);
            vm.setTurboMode(false);
            vm.initialized = true;

            // Create renderer with our canvas
            const renderer = new ScratchRender(canvasRef.current);
            rendererRef.current = renderer;
            
            // Attach renderer to VM
            vm.attachRenderer(renderer);
            
            // Start VM
            vm.start();
            
            // Start animation loop
            const animate = () => {
                if (rendererRef.current) {
                    rendererRef.current.draw();
                }
                animationFrameRef.current = requestAnimationFrame(animate);
            };
            
            animate();
            console.log('Renderer attached successfully');
            
            // Now load the project
            loadProject();
        } catch (err) {
            console.error('Error setting up renderer:', err);
            setError(`Failed to initialize renderer: ${err.message}`);
            setLoading(false);
        }
    }, [isOpen, canvasRef.current]);
    
    // Function to load the project
    const loadProject = async () => {
        if (!projectId) return;
        
        try {
            // Download project data
            const projectData = await ProjectManager.downloadProjectSB3(projectId);
            
            // Load into VM
            await vmRef.current.loadProject(projectData);
            
            // Start project
            vmRef.current.greenFlag();
            
            setProjectLoaded(true);
            setLoading(false);
            console.log('Project loaded successfully');
        } catch (err) {
            console.error('Error loading project:', err);
            setError(`Failed to load project: ${err.message}`);
            setLoading(false);
        }
    };
    
    // Function to restart the project
    const handleGreenFlag = () => {
        if (vmRef.current) {
            vmRef.current.greenFlag();
        }
    };
    
    // Function to stop the project
    const handleStopAll = () => {
        if (vmRef.current) {
            vmRef.current.stopAll();
        }
    };
    
    return (
        <ReactModal
            isOpen={isOpen}
            onRequestClose={onClose}
            className={styles.playerModalContent}
            overlayClassName={styles.playerModalOverlay}
            contentLabel={projectTitle || 'Project Player'}
            appElement={document.getElementById('app')}
        >
            <div className={styles.playerModalHeader}>
                <div className={styles.playerTitle}>
                    {projectTitle}
                </div>
                <button
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="Close"
                >
                    <img
                        className={styles.closeIcon}
                        src={closeIcon}
                        alt="Close"
                    />
                </button>
            </div>
            
            <div className={styles.playerContainer}>
                {loading ? (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner} />
                        <div>Loading project...</div>
                    </div>
                ) : error ? (
                    <div className={styles.errorContainer}>
                        {error}
                    </div>
                ) : (
                    <div className={styles.stageWrapper}>
                        <canvas
                            ref={canvasRef}
                            className={styles.stageCanvas}
                            width="720"
                            height="540"
                        />
                        
                        {projectLoaded && (
                            <div className={styles.playerControls}>
                                <button
                                    className={styles.greenFlagButton}
                                    onClick={handleGreenFlag}
                                    title="Start"
                                >
                                    ▶️
                                </button>
                                <button
                                    className={styles.stopButton}
                                    onClick={handleStopAll}
                                    title="Stop"
                                >
                                    ⏹️
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </ReactModal>
    );
};

PlayerModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default PlayerModal;