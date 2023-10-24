import {LightningElement, wire, track, api} from 'lwc';
import {ShowToastEvent} from 'lightning/platformShowToastEvent';
import {refreshApex} from '@salesforce/apex';
import {deleteRecord, updateRecord} from 'lightning/uiRecordApi';
import {NavigationMixin, CurrentPageReference} from 'lightning/navigation';
import CURRENT_FORM_FACTOR from '@salesforce/client/formFactor';
import getRelatedListData from '@salesforce/apex/EI_RelatedListController.getRelatedListData';
import getChildRelationshipName from '@salesforce/apex/EI_RelatedListController.getChildRelationshipName';
import successMessage from '@salesforce/label/c.ABI_SFA_Record_Successfully_Deleted';
import successTitle from '@salesforce/label/c.ABI_SFA_Success';
import inlineEditErrorUpdatingMessage
    from '@salesforce/label/c.ABI_SFA_GENERIC_Inline_edit_error_updating_records_message';
import inlineEditSuccessUpdateMessage
    from '@salesforce/label/c.ABI_SFA_GENERIC_Inline_edit_records_update_success_message';
import unexpectedErrorMessage from '@salesforce/label/c.ABI_SFA_Unexpected_Error_Occurred';
import jsonExceptionMessage from '@salesforce/label/c.ABI_SFA_Component_Parameters_Invalid';
import errorTitle from '@salesforce/label/c.ABI_SFA_Error';
import VIEW_ALL_BUTTON_LABEL from '@salesforce/label/c.ABI_CXC_View_All_Button_Label';
import COLLAPSE_BUTTON_LABEL from '@salesforce/label/c.ABI_CXC_Collapse_Button_Lable';

const DESKTOP_FORM_FACTOR = 'Large';

export default class EI_RelatedList extends NavigationMixin(LightningElement) {

    recordIdInBrackets = '{{{recordId}}}'; 
    maxNumberOfRecords = 6;
    @api sObjectName;
    @api parentFieldName;
    @api recordId;
    @api title;
    @api parameters;
    @api mobileParameters;
    @track data;
    @track columns;
    @track error;
    @track configurations;
    @track updatedRecords = new Map();
    showSpinner = true;
    showRefresh = false;
    updatedRecordsFlag;
    records;
    sortedBy;
    sortDirection;
    showViewAllButton;
    jsonConfigurations;
    iconName;
    wiredRecordsResponse;
    serverSideSorting;
    isEditConst;
    _isTableContentVisible = true;
    currentDatatableHeight;
    columnWidthsMode = 'fixed';

    _isEditable = true;
    @api set isEditable(value) {

        if (undefined === value) {
            value = true;
        }

        if (this._isEditable !== value) {
            this._isTableContentVisible = false;
            setTimeout(() => this._isTableContentVisible = true, 0);
        }

        this._isEditable = value;
    }

    get isEditable() {
        return this._isEditable;
    }

    footerButtonText = VIEW_ALL_BUTTON_LABEL;
    touchMoveHandlerFunctionWithThisContext = this.touchMoveHandler.bind(this);

    get relationFieldName() {
        return this.parentFieldName && !this.parentFieldName.includes(',') ? this.parentFieldName : null;
    }

    get isViewAllMode() {
        return this.footerButtonText === COLLAPSE_BUTTON_LABEL;
    }

    get datatableHeight() {
        if (
            this.isViewAllMode
            && this.configurations
            && this.records
            && this.configurations.maxNumberOfRecords < this.records.length
        ) {
            return 'height: '+ this.currentDatatableHeight + 'px';
        } else {
            return '';
        }
    }

    constructor() {
        super();
        document.addEventListener('lightning__showtoast', this.handleToastEvent.bind(this));
    }

    handleToastEvent() {
        let config = JSON.parse(this.jsonConfigurations);
        let actions = config ? config.rowActions : null;
        let isHasEdit;
        if (actions) {
            for (let i = 0; i < actions.length; i++) {
                if ((actions[i].name).toLowerCase().includes(this.isEditConst)) {
                    isHasEdit = true;
                    break;
                }
            }
        }
        if (isHasEdit) {
            return refreshApex(this.wiredRecordsResponse);
        }
    }

    connectedCallback() {
        if (this.parameters || this.mobileParameters) {
            try {
                if (
                    CURRENT_FORM_FACTOR !== DESKTOP_FORM_FACTOR
                    && this.mobileParameters
                    && this.mobileParameters.trim()
                ) {
                    this.configurations = JSON.parse(this.mobileParameters);
                } else {
                    this.configurations = JSON.parse(this.parameters);
                }
            } catch (jsonException) {
                this.showSpinner = false;
                this.showErrorToast(jsonExceptionMessage);
            }
            if (this.configurations) {

                this.configurations.sObjectName = this.sObjectName;
                this.showRefresh = this.configurations.showRefresh;
                this.configurations.parentFieldName = this.parentFieldName;
                this.configurations.recordId = this.recordId;
                this.sortedBy = this.replaceDotsWithUnderscore(this.configurations.defaultSortField);
                this.sortDirection = this.configurations.defaultSortDirection;
                this.iconName = this.configurations.iconName ? 'standard:related_list' : null;
                this.serverSideSorting = this.configurations.serverSideSorting ? false : null;
                this.configurations.fieldsNames = this.getFieldsNamesFromColumns(this.configurations);
                this.configurations.buttons = this.replaceRecordId(this.configurations.buttons);
                this.jsonConfigurations = JSON.stringify(this.configurations);
                this.isEditConst = 'edit';
                
                if (this.configurations.maxNumberOfRecords) {
                    this.maxNumberOfRecords = this.configurations.maxNumberOfRecords;
                }

                if (this.configurations.columnWidthsAutoMode) {
                    this.columnWidthsMode = 'auto';
                }
            }
        }

        this.subscribeToTouchMoveEvent();
    }

    renderedCallback() {

        let datatable = this.template.querySelector('div.table-content');
        if (datatable) {
            if (this.isEditable) {
                datatable.classList.remove('disable-content');
            } else {
                datatable.classList.add('disable-content');
            }
        }
    }

    disconnectedCallback() {
        this.unsubscribeToTouchMoveEvent();
    }

    @wire(getRelatedListData, ({
        configurations : "$jsonConfigurations"
    }))
    wiredRecords(response) {

        this.wiredRecordsResponse = response;
        if (response.data) {
            if (this.configurations && this.configurations.columns) {
                this.records = this.flattenFieldsPaths(this.configurations.columns, response.data);
                this.records = this.populateUrlFields(this.configurations.columns, this.records);
                this.records = this.replaceFieldsValues(this.configurations.columns, this.records);
                this.columns = this.buildColumns(this.configurations.columns);
                this.sortRecords();
                if (this.records.length <= 0) {
                    this.data = undefined;
                }

                if (this.configurations.showAllRecordsOnTheSamePage) {
                    this.showViewAllButton = this.maxNumberOfRecords < this.records.length;
                } else if (this.records.length > 0) {
                    this.showViewAllButton = this.configurations.showViewAllButton;
                }
            }
        } else if (response.error) {
            let errorMessage = (response.error && response.error.body && response.error.body.exceptionType && response.error.body.exceptionType.includes('InvalidParameters')
                ? response.error.body.message
                : undefined);
            this.showErrorToast(errorMessage);
            this.columns = undefined;
            this.records = undefined;
            this.showViewAllButton = false;
        }
        this.showSpinner = false;
    }

    @wire(getChildRelationshipName, ({
        childSObjectName : '$sObjectName',
        parentRecordId : "$recordId",
        relationFieldName : '$relationFieldName'
    })) childRelationshipName;

    @wire(CurrentPageReference)
    pageRef() {
        if (this.configurations && this.configurations.forceApexRefreshOnNavigation) {
            this.refreshWire();
        }
    };

    refreshWire() {
        refreshApex(this.wiredRecordsResponse);
    }

    buildColumns(columns) {

        let columnsTemp = JSON.parse(JSON.stringify(columns));
        for (let column of columnsTemp) {
            if(column.isHideField) {
                let index = columnsTemp.indexOf(column);
                if (index !== -1) {
                    columnsTemp.splice(index, 1);
                    continue;
                }
            }
            if (column.fieldName && column.fieldName.includes('.')) {
                column.fieldName = this.replaceDotsWithUnderscore(column.fieldName);
            }
            if (column.urlField) {
                column.fieldName += column.urlField.includes('.') ? this.replaceDotsWithUnderscore(column.urlField) : column.urlField;
            }
            if (column.typeAttributes && column.typeAttributes.label && column.typeAttributes.label.fieldName) {
                column.typeAttributes.label.fieldName = this.replaceDotsWithUnderscore(column.typeAttributes.label.fieldName);
            }
        }

        let columnsSize = columnsTemp.length;
        if (this.configurations.rowActions) {
            columnsTemp[columnsSize] = {
                type : 'action',
                typeAttributes : {
                    rowActions : this.configurations.rowActions, menuAlignment : 'auto'
                }
            };
        }

        const useProportions = columnsTemp.some(column => column.columnProportion)
            && columnsTemp.every(column => column.columnProportion || column.initialWidth);

        if (useProportions) {
            const totalInitialWidth = columnsTemp.reduce((acc, column) => acc += column.initialWidth ? column.initialWidth : 0, 0);
            const totalProportions = columnsTemp.reduce(
                (acc, column) => acc += !column.initialWidth && column.columnProportion ? column.columnProportion : 0
                , 0);

            const tableContainer = this.template.querySelector('[data-related-list-container]');
            const tableContainerWidth = tableContainer ? tableContainer.offsetWidth - totalInitialWidth : null;
            const portionInPixels = tableContainerWidth / totalProportions;

            columnsTemp.forEach(column => {
                if (!column.initialWidth) {
                    column.initialWidth = Math.round(portionInPixels * column.columnProportion * 100) / 100;
                    delete column.columnProportion;
                }
            });
        }

        return columnsTemp;
    }

    getFieldsNamesFromColumns(configurations) {

        let fieldsNames = [];
        if (configurations.columns) {
            for (let column of configurations.columns) {
                fieldsNames.push(column.fieldName);
            }
        }
        return fieldsNames;
    }

    handleSort(event) {

        this.showSpinner = true;
        const {fieldName : sortedBy, sortDirection} = event.detail;
        this.sortedBy = sortedBy;
        this.sortDirection = sortDirection;

        if (this.serverSideSorting) {
            this.configurations.sortField = this.sortedBy;
            this.configurations.sortDirection = this.sortDirection;
            this.jsonConfigurations = JSON.stringify(this.configurations);

            refreshApex(this.wiredRecordsResponse)
                .catch((error) => {
                    this.showErrorToast(error.message);
                });
        } else {
            this.sortRecords();
        }
        this.showSpinner = false;
    }

    sortRecords() {

        if (this.records) {
            const clonedData = [...this.records];
            clonedData.sort(this.sortBy(this.sortedBy, this.sortDirection === 'asc' ? 1 : -1));
            this.records = clonedData;
            this.data = this.getRecordsToShow(this.records);
        }
    }

    replaceDotsWithUnderscore(fullFieldPath) {

        return fullFieldPath ? fullFieldPath.replace(/\./, '_') : fullFieldPath;
    }

    flattenFieldsPaths(columns, records) {

        if (!records || !columns) {
            return records;
        }

        let recordsTemp = JSON.parse(JSON.stringify(records));
        for (let column of columns) {
            if (column.fieldName && column.fieldName.includes('.')) {
                let fieldPathWithoutDots = this.replaceDotsWithUnderscore(column.fieldName);
                let relationshipFields = column.fieldName.split('.');
                for (let record of recordsTemp) {
                    let fieldValue = record[relationshipFields[0]];
                    for (let i = 1; i < relationshipFields.length; i++) {
                        if (fieldValue) {
                            fieldValue = fieldValue[relationshipFields[i]];
                        } else {
                            break;
                        }
                    }
                    record[fieldPathWithoutDots] = fieldValue;
                }
            }
        }

        return recordsTemp;
    }

    populateUrlFields(columns, records) {

        if (!records || !columns) {
            return records;
        }

        for (let column of columns) {
            if (column.urlField) {
                let fieldPathWithoutDots = this.replaceDotsWithUnderscore(column.fieldName) + this.replaceDotsWithUnderscore(column.urlField);
                let relationshipFields = column.urlField.split('.');
                for (let record of records) {
                    if (column.urlField.includes('.')) {
                        let fieldValue = record[relationshipFields[0]];
                        for (let i = 1; i < relationshipFields.length; i++) {
                            fieldValue = fieldValue[relationshipFields[i]];
                        }
                        record[fieldPathWithoutDots] = '/' + fieldValue;
                    } else if (record[column.urlField]) {
                        record[fieldPathWithoutDots] = '/' + record[column.urlField];
                    }
                }
            }
        }

        return records;
    }

    replaceFieldsValues(columns, records) {

        if (!records || !columns) {

            return records;
        }

        for (let column of columns) {
            if (column.replacementParameters) {
                for (let record of records) {
                    if (record[column.fieldName]) {
                        record[column.fieldName] = record[column.fieldName].replaceAll(
                            column.replacementParameters.aim,
                            column.replacementParameters.replacement
                        );
                    }
                }
            }
        }

        return records;
    }

    sortBy(field, reverse, primer) {

        const key = primer
            ? function (x) {
                return primer(x[field]);
            }
            : function (x) {
                return x[field];
            };

        return function (a, b) {
            a = key(a);
            b = key(b);
            return reverse * ((a > b) - (b > a));
        };
    }

    handleRowAction(event) {

        event.stopPropagation();
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        switch (actionName) {
            case 'delete':
                this.deleteRecord(row.Id);
                break;
            case this.isEditConst:
                this.editRecord(row.Id);
                break;
            default:
                let rowRecord = this.records.find(x => x.Id === row.Id);
                this.dispatchEvent(new CustomEvent(actionName, {detail : {recordId : row.Id, record: rowRecord}}));
        }
    }

    deleteRecord(recordId) {

        this.showSpinner = true;
        deleteRecord(recordId)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title : successTitle,
                        message : successMessage,
                        variant : 'success'
                    })
                );
                return refreshApex(this.wiredRecordsResponse);
            })
            .catch((error) => {
                this.showErrorToast(error.message);
            }).finally(() => {
            this.showSpinner = false;
        });
    }

    editRecord(recordId) {

        this[NavigationMixin.Navigate]({
            type : 'standard__recordPage',
            attributes : {
                recordId : recordId,
                actionName : this.isEditConst
            }
        });
    }

    handleViewAll() {
        let datatable = this.template.querySelector('div.table-content');
        this.currentDatatableHeight = datatable.clientHeight;
        if (this.configurations.showAllRecordsOnTheSamePage) {
            if (!this.isViewAllMode) {
                this.footerButtonText = COLLAPSE_BUTTON_LABEL;
                this.data = this.records;
            } else {
                this.footerButtonText = VIEW_ALL_BUTTON_LABEL;
                this.data = this.getRecordsToShow(this.records);
            }
        } else {
            if (this.childRelationshipName.data) {
                this[NavigationMixin.Navigate]({
                    type : 'standard__recordRelationshipPage',
                    attributes : {
                        recordId : this.recordId,
                        relationshipApiName : this.childRelationshipName.data,
                        actionName : 'view'
                    }
                });
            } else {
                let errorMessage = (this.childRelationshipName.error && this.childRelationshipName.error.body && this.childRelationshipName.error.body.message
                    ? this.childRelationshipName.error.body.message
                    : undefined);
                this.showErrorToast(errorMessage);
            }
        }
    }

    replaceRecordId(buttons) {

        if (buttons) {
            for (let button of buttons) {
                if (button.url && button.url.includes(this.recordIdInBrackets)) {
                    button.url = button.url.replaceAll(this.recordIdInBrackets, this.recordId);
                    button.url = button.url.split(this.recordIdInBrackets).join(this.recordId);
                }
            }
        }

        return buttons;
    }

    handleButtonClick(event) {

        let key = event.target.title;
        let navigateProperties = this.getFullURLParams(key);
        let fullURL = navigateProperties.fullURL;
        if (fullURL) {
            let isOpenInNewTab = navigateProperties.isOpenInNewTab;
            let isOpenInClassic = navigateProperties.isOpenInClassic;
            if (fullURL) {
                if (isOpenInNewTab) {
                    this[NavigationMixin.GenerateUrl]({
                        type : 'standard__webPage',
                        attributes : {
                            url : fullURL
                        }
                    }).then(url => {
                        window.open(fullURL, "_blank");
                    });
                } else if (isOpenInClassic) {
                    window.open(fullURL, "_self");
                } else {
                    this[NavigationMixin.Navigate]({
                        type : 'standard__webPage',
                        attributes : {
                            url : fullURL
                        }
                    });
                }
            }
        }
        this.dispatchEvent(new CustomEvent(key));
    }

    getFullURLParams(key) {

        let paramsToReturn = {};
        let buttonURL;
        let isOpenInClassic;
        let isOpenInNewTab;
        if (this.configurations.buttons) {
            for (let button of this.configurations.buttons) {
                if (button.name === key) {
                    buttonURL = button.url;
                    isOpenInClassic = button.openInClassic;
                    isOpenInNewTab = button.openInNewTab;
                    break;
                }
            }
        }
        paramsToReturn['isOpenInNewTab'] = isOpenInNewTab;
        paramsToReturn['isOpenInClassic'] = isOpenInClassic;
        if (!buttonURL) {
            paramsToReturn['fullURL'] = buttonURL;
            return paramsToReturn;
        }
        let urlString = window.location.href;
        let baseURL = urlString ? urlString.substring(0, urlString.indexOf('.com/') + 4) : undefined;
        let fullURL = baseURL && buttonURL ? baseURL + buttonURL : undefined;
        paramsToReturn['fullURL'] = fullURL;

        return paramsToReturn;
    }

    getRecordsToShow(records) {

        let recordsToShow;
        if (
            records && records.length > this.maxNumberOfRecords
            && !this.isViewAllMode
        ) {
            recordsToShow = JSON.parse(JSON.stringify(records.slice(0, this.maxNumberOfRecords)));
        } else {
            recordsToShow = JSON.parse(JSON.stringify(records));
        }

        return recordsToShow;
    }

    showErrorToast(errorMessage) {

        this.dispatchEvent(
            new ShowToastEvent({
                title : errorTitle,
                message : errorMessage ? errorMessage : unexpectedErrorMessage,
                variant : 'error'
            })
        );
    }

    get numberOfRecordsTitle() {
        const numberOfRecords = this.records ? this.records.length : 0;
        if (!this.isViewAllMode && numberOfRecords > this.maxNumberOfRecords) {
            return `${this.maxNumberOfRecords}+`;
        } else {
            return numberOfRecords.toString();
        }
    }

    handlePicklistChanged(event) {

        this.showSpinner = true;
        event.stopPropagation();
        const dataReceived = event.detail.data;
        const updatedRecord = {Id : dataReceived.context};
        updatedRecord[dataReceived.fieldname] = dataReceived.value;
        this.updateRecords(updatedRecord);
        this.showSpinner = false;
    }

    handleActionButtonClicked(event) {

        this.showSpinner = true;
        event.stopPropagation();
        const dataReceived = event.detail.data;
        const updatedRecord = {Id : dataReceived.context};
        updatedRecord[dataReceived.fieldname] = dataReceived.value;
        this.updateRecords(updatedRecord);
        this.showSpinner = false;
    }

    updateRecords(updatedRecord) {

        delete updatedRecord.id;
        if (!this.updatedRecords.has(updatedRecord.Id)) {
            this.updatedRecords.set(updatedRecord.Id, JSON.parse(JSON.stringify(updatedRecord)))
        } else {
            let record = this.updatedRecords.get(updatedRecord.Id);
            for (const field in updatedRecord) {
                if (updatedRecord.hasOwnProperty(field)) {
                    record[field] = updatedRecord[field];
                }
            }
        }
        //loop to populated recordsToShow with updated values
        for (let record of this.data) {
            if (record.Id === updatedRecord.Id) {
                for (const field in updatedRecord) {
                    if (updatedRecord.hasOwnProperty(field)) {
                        record[field] = updatedRecord[field];
                    }
                }
            }
        }
        this.updatedRecordsFlag = [{}];
    }

    handleCellChange(event) {
        this.showSpinner = true;
        let draftRecord = event.detail.draftValues[0];
        let updatedRecord = {Id : this.data[draftRecord.id.substring(4)].Id};
        for (let updatedFieldName in draftRecord) {
            if (draftRecord.hasOwnProperty(updatedFieldName) && updatedFieldName !== 'Id') {
                updatedRecord[updatedFieldName] = draftRecord[updatedFieldName];
            }
        }
        this.updateRecords(updatedRecord);
        this.showSpinner = false;
    }

    handleSave(event) {

        this.showSpinner = true;
        const recordInputs = Array.from(this.updatedRecords.values()).slice().map(draft => {
            const fields = Object.assign({}, draft);
            delete fields['id'];
            return {fields};
        });

        const promises = recordInputs.map(recordInput => updateRecord(recordInput));
        Promise.all(promises).then(records => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title : successTitle,
                    message : inlineEditSuccessUpdateMessage,
                    variant : 'success'
                })
            );
            // Clear all draft values
            this.updatedRecords = new Map();
            this.updatedRecordsFlag = [];
            // Display fresh data in the datatable
            return refreshApex(this.wiredRecordsResponse);
        }).catch(error => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title : inlineEditErrorUpdatingMessage,
                    message : error.body.message,
                    variant : 'error'
                })
            );
        }).finally(() => {
            this.showSpinner = false;
        });
    }

    handleCancel(event) {

        this.showSpinner = true;
        this.data = this.getRecordsToShow(this.records);
        this.updatedRecords = new Map();
        this.updatedRecordsFlag = [];
        this.showSpinner = false;

    }

    @api
    refreshRecords() {

        this.showSpinner = true;
        refreshApex(this.wiredRecordsResponse);
        this.showSpinner = false;
    }

    subscribeToTouchMoveEvent() {
        if (CURRENT_FORM_FACTOR !== DESKTOP_FORM_FACTOR) {
            window.addEventListener('touchmove', this.touchMoveHandlerFunctionWithThisContext);
        }
    }

    unsubscribeToTouchMoveEvent() {
        if (CURRENT_FORM_FACTOR !== DESKTOP_FORM_FACTOR) {
            window.removeEventListener('touchmove', this.touchMoveHandlerFunctionWithThisContext);
        }
    }

    touchMoveHandler(event) {
        if (!window.pageYOffset) {
            this.refreshRecords();
        }
    }
}