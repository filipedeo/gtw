import React from 'react';
import { useGuitarStore } from '../stores/guitarStore';

const SettingsPanel: React.FC = () => {
    const { config, setConfig } = useGuitarStore();

    const handleStringChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newConfig = { ...config, numberOfStrings: parseInt(event.target.value) };
        setConfig(newConfig);
    };

    return (
        <div className='settings-panel'>
            <h1>Guitar Settings</h1>
            <label>Number of Strings:
                <select value={config.numberOfStrings} onChange={handleStringChange}>
                    <option value="6">6 Strings</option>
                    <option value="7">7 Strings</option>
                </select>
            </label>
        </div>
    );
};

export default SettingsPanel;