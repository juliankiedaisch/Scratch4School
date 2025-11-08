import React from 'react';
import configureStore from 'redux-mock-store';

import {renderWithIntl} from '../../helpers/intl-helpers.jsx';

import ProjectFetcherHOC from '../../../src/lib/project-fetcher-hoc.jsx';
import {LoadingState} from '../../../src/reducers/project-state';
import {LegacyStorage} from '../../../src/lib/legacy-storage';
import {IntlProvider} from 'react-intl';
import * as ProjectManager from '../../../src/lib/project-management';

jest.mock('react-ga');
jest.mock('../../../src/lib/project-management');

describe('ProjectFetcherHOC', () => {
    const mockStore = configureStore();
    let store;
    let storage;
    let mockVm;

    beforeEach(() => {
        const storageConfig = new LegacyStorage();
        storage = storageConfig.scratchStorage;
        
        // Create a mock VM with loadProject method
        mockVm = {
            loadProject: jest.fn().mockResolvedValue(undefined)
        };
        
        store = mockStore({
            scratchGui: {
                config: {storage: storageConfig},
                projectState: {},
                vm: mockVm
            }
        });
        
        // Reset mocks
        jest.clearAllMocks();
    });

    test('when there is an id, it tries to update the store with that id', () => {
        const Component = ({projectId}) => <div>{projectId}</div>;
        const WrappedComponent = ProjectFetcherHOC(Component);
        const mockSetProjectIdFunc = jest.fn();
        renderWithIntl(
            <WrappedComponent
                projectId="100"
                setProjectId={mockSetProjectIdFunc}
                store={store}
            />
        );
        expect(mockSetProjectIdFunc.mock.calls[0][0]).toBe('100');
    });
    test('when there is a reduxProjectId and isFetchingWithProjectId is true, it loads the project', async () => {
        const mockedOnFetchedProject = jest.fn();
        
        // Mock the downloadProjectSB3 function to return mock data
        const mockSb3Data = new ArrayBuffer(100);
        ProjectManager.downloadProjectSB3.mockResolvedValue(mockSb3Data);
        
        const Component = ({projectId}) => <div>{projectId}</div>;
        const WrappedComponent = ProjectFetcherHOC(Component);
        const {rerender} = renderWithIntl(
            <WrappedComponent
                store={store}
                onFetchedProjectData={mockedOnFetchedProject}
            />
        );
        rerender(
            <IntlProvider
                locale="en"
                messages={{ }}
            >
                <WrappedComponent
                    store={store}
                    onFetchedProjectData={mockedOnFetchedProject}
                    reduxProjectId="100"
                    isFetchingWithId
                    loadingState={LoadingState.FETCHING_WITH_ID}
                />
            </IntlProvider>
        );

        // Wait for async operations to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify that downloadProjectSB3 was called with the correct project ID
        expect(ProjectManager.downloadProjectSB3).toHaveBeenCalledWith('100');
        
        // Verify that onFetchedProjectData was called with the sb3Data
        // (VM loading happens later in vm-manager-hoc)
        expect(mockedOnFetchedProject).toHaveBeenCalledWith(mockSb3Data, LoadingState.FETCHING_WITH_ID);
    });
});
