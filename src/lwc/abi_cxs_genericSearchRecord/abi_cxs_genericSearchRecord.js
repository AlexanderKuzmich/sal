import {LightningElement, track, api, wire} from 'lwc';
import getRecordsWithInitialSearchString
    from '@salesforce/apex/ABI_SFA_GenericSearchRecordController.getRecordsWithInitialSearchString';
import FORM_FACTOR from '@salesforce/client/formFactor';
import {ONE_ROW_HEIGHT_GENERIC_SEARCH_RECORD_BY_FORM_FACTOR_EM, formFactorTypes} from 'c/abi_cxs_interactionConstants';


export default class AbiCxsGenericSearchRecord extends LightningElement {

    isNoRecordsFound = false;
    showInput = true;
    inputOnFocus = false;
    isShowSpinner = false;
    pillHeight;
    timeoutFunction;

    @api recordIsRequired = false;
    @api fieldOutputOrder;
    @api fieldsForSelectedItem;
    @api fieldsToApplySeparator;
    @api noRecordFoundLabel;
    @api searchLabel;
    @api isSearchInputDisabled = false;
    @api selectedRecordId;
    @api rowsToShow;
    @api rowsHeight;
    initialConditionsForQuery; 
    _conditionsForQuery;
    @api set conditionsForQuery(value) {
        this.initialConditionsForQuery = JSON.parse(JSON.stringify(value));
        this._conditionsForQuery = JSON.parse(JSON.stringify(value));
    };

    get heightOfShownRows(){

        let heightOfOneRow = this.rowsHeight ? this.rowsHeight[FORM_FACTOR] : ONE_ROW_HEIGHT_GENERIC_SEARCH_RECORD_BY_FORM_FACTOR_EM[FORM_FACTOR];
        let additionalHeight = (this.initialConditionsForQuery.maxRecords && this.initialConditionsForQuery.maxRecords > this.rowsToShow) ? 1 : 0;
        return 'max-height: ' + (this.rowsToShow * heightOfOneRow + additionalHeight) + 'em';
    }

    get conditionsForQuery() {
        return this._conditionsForQuery;
    }

    @api search(value) {
        this.searchValue = value;
        this.options = [];
        this.closeList();
        if (!this.moreThanOneCharacterEntered()) {
            this.isShowSpinner = false;
        } else {
            this.stopTimeoutFunction();
            this.runTimeoutFunction();
            this.isNoRecordsFound = false;
        }
    }

    stickyIdValueSearch;

    @api searchByIdField(value) {
        this.stickyIdValueSearch = value;
        this._conditionsForQuery.extendedWhereClause[this.conditionsForQuery.idFieldApiName] = this.stickyIdValueSearch;
        this.options = [];
        this.closeList();
        this.isShowSpinner = true;
        this.doQueryAndShowResults();
    }


    @track options = [];
    @track showOptions = false;
    @track searchValue = '';
    @track selectedGroups = [];

    get isShowOptions() {
        return this.showOptions;
    }

    connectedCallback() {
        this.fieldsToApplySeparator = new Map(this.fieldsToApplySeparator);
    }

    renderedCallback() {
        const inputBox = this.template.querySelector('lightning-input');
        if (inputBox) {
            this.pillHeight = inputBox.scrollHeight;
        }
        if (inputBox && this.inputOnFocus) {
            inputBox.focus();
        }
        this.inputOnFocus = false;

        if (!this.template.querySelector('.styles-container').innerHTML) {
            this.template.querySelector('.styles-container').innerHTML = this.getStylesString();
        }
    }

    getStylesString() {
        return `
            <style>
                .slds-pill {
                    width: 100%;
                    height: ` + this.pillHeight + `px;
                }
                .slds-pill__label {
                    width: 100%;
                }
                .customWidth {
                    width: 100%;
                }
            </style>`;
    }

    handleClick() {
        if (this.moreThanOneCharacterEntered() && !this.isShowSpinner) {
            this.showOptions = !this.showOptions;
        }
        this.isNoRecordsFound = this.options.length === 0;
    }

    closeList() {
        this.showOptions = false;
    }

    closeListOutsideAreaMobile() {
        if (FORM_FACTOR !== formFactorTypes.DESKTOP) {
            this.closeList();
        }
    }

    handleKeyUp(event) {
        this.search(event.target.value.toLowerCase().trim());
    }

    runTimeoutFunction() {
        this.isShowSpinner = true;
        this.timeoutFunction = setTimeout(() => {
            this.doQueryAndShowResults();
        }, 1000);
    }

    moreThanOneCharacterEntered() {
        return this.searchValue.length > 1;
    }

    stopTimeoutFunction() {
        clearTimeout(this.timeoutFunction);
    }

    doQueryAndShowResults() {
        if (this.moreThanOneCharacterEntered() || this.stickyIdValueSearch) {
            getRecordsWithInitialSearchString({
                searchString : this.searchValue.toString(),
                objectApiName : this.conditionsForQuery.objectApiName,
                idFieldApiName : this.conditionsForQuery.idFieldApiName,
                valueFieldApiNames : this.conditionsForQuery.valueFieldApiNames,
                extraFieldApiNames : this.conditionsForQuery.extraFieldApiNames,
                extendedWhereClause : JSON.stringify(this.conditionsForQuery.extendedWhereClause),
                commonFieldForSearch : this.conditionsForQuery.commonFieldForSearch,
                maxRecords : this.conditionsForQuery.maxRecords * 2
            })
                .then(result => {
                    if (result.searchString === this.searchValue) {
                        let searchValueSubStrings = this.searchValue.split(' ').sort((a, b) => b.length - a.length);
                        searchValueSubStrings = searchValueSubStrings.filter(function (item) {
                            return item !== ''
                        });
                        this.options = [];
                        result.records.forEach(element => {
                            const elementMap = new Map();
                            const keys = Object.keys(element);
                            for (let i = 0; i < keys.length; i++) {
                                elementMap.set(keys[i], element[keys[i]]);
                            }

                            /*below extra check avoids results where two search substrings appear in the same string in
                            the result, e.g. - search string is 'test 22', results are 'test22' and 'testresult 522'.
                            We have to show just the second variant.
                             */
                            let k = 0;
                            if (this.conditionsForQuery.commonFieldForSearch && this.conditionsForQuery.valueFieldApiNames.includes(this.conditionsForQuery.commonFieldForSearch)) {
                                let commonFieldForSearchValueSubStrings = ((new Map(Object.entries(element))).get(this.conditionsForQuery.commonFieldForSearch)).split(' ');
                                let countOfRemovingValues = 0;
                                if (commonFieldForSearchValueSubStrings.length > 0) {
                                    for (let u = 0; u < searchValueSubStrings.length; u++) {
                                        for (let i = 0; i < commonFieldForSearchValueSubStrings.length; i++) {
                                            if (commonFieldForSearchValueSubStrings[i].toLowerCase().includes(searchValueSubStrings[u].toLowerCase())) {
                                                commonFieldForSearchValueSubStrings.splice(i, 1);
                                                countOfRemovingValues++;
                                                break;
                                            }
                                        }
                                    }

                                    if (countOfRemovingValues == searchValueSubStrings.length) {
                                        k++;
                                    }

                                }
                            } else
                                for (let i = 0; i < this.conditionsForQuery.valueFieldApiNames.length; i++) {
                                    if (elementMap.get(this.conditionsForQuery.valueFieldApiNames[i]) && elementMap.get(this.conditionsForQuery.valueFieldApiNames[i]).toLowerCase().includes(this.searchValue)) {
                                        k++;
                                    }
                                }

                            if (k !== 0) {
                                let newValue = {
                                    'dropdownFields' : '',
                                    'itemFields' : '',
                                    'Id' : ''
                                };
                                for (let i = 0; i < this.fieldOutputOrder.length; i++) {
                                    newValue.Id = elementMap.get('Id');
                                    if (elementMap.get(this.fieldOutputOrder[i])) {
                                        newValue.dropdownFields += elementMap.get(this.fieldOutputOrder[i]);
                                        newValue.dropdownFields += (this.fieldsToApplySeparator.has(this.fieldOutputOrder[i]) && i < this.fieldOutputOrder.length - 1) ? this.fieldsToApplySeparator.get(this.fieldOutputOrder[i]) : ' ';
                                    }
                                }
                                for (let i = 0; i < this.fieldsForSelectedItem.length; i++) {
                                    if (elementMap.get(this.fieldsForSelectedItem[i])) {
                                        newValue.itemFields += (elementMap.get(this.fieldsForSelectedItem[i]));
                                        newValue.itemFields += (this.fieldsToApplySeparator.has(this.fieldsForSelectedItem[i]) && i < this.fieldsForSelectedItem.length - 1) ? this.fieldsToApplySeparator.get(this.fieldsForSelectedItem[i]) : ' ';
                                    }
                                }
                                this.options.push(newValue);
                            }
                        })
                        if (this.options.length > this.conditionsForQuery.maxRecords) {
                            this.options.length = this.conditionsForQuery.maxRecords;
                        }

                        if (this.stickyIdValueSearch && 1 === result.records.length) {
                            const newValue = this.options[0];
                            this.selectedRecordId = this.stickyIdValueSearch;
                            this.showInput = false;
                            this.searchValue = '';
                            this.selectedGroups.push(newValue.itemFields);
                            this.handleChange();
                        } else {
                            this.showOptions = true;
                        }
                        this.isNoRecordsFound = this.options.length === 0;
                        this.isShowSpinner = false;
                    }
                })
                .catch(error => {
                    console.error(error);
                    this.isShowSpinner = false;
                });
        }
    }

    handleRemoveGroup() {
        this._conditionsForQuery = this.initialConditionsForQuery;
        this.stickyIdValueSearch = null;
        this.inputOnFocus = true;
        this.showInput = true;
        this.selectedGroups = [];
        this.selectedRecordId = null;
        this.handleChange();
    }

    handleOptionSelect(event) {
        this.showInput = false;
        this.searchValue = '';
        this.selectedRecordId = event.currentTarget.dataset.id;
        this.selectedGroups.push(event.currentTarget.dataset.name);
        this.closeList();
        this.handleChange();
    }

    @api handleOptionSelectFromParent(event) {
        this.handleRemoveGroup();
        this.showInput = false;
        this.searchValue = '';
        this.selectedRecordId = event.detail.accId;
        this.selectedGroups.push(event.detail.accName + ', ' + event.detail.accAddress);
        this.closeList();
        this.handleChange();
    }

    handleChange() {
        const selectedEvent = new CustomEvent("changeselectedrecordid", {
            detail : this.selectedRecordId
        });

        this.dispatchEvent(selectedEvent);
    }


    @api validateRecordInput() {
        var validationIsPassed;
        var inputSelector = this.template.querySelector('.requiredClass');
        if (inputSelector) {
            inputSelector.value = '';
            validationIsPassed = inputSelector.reportValidity();
            inputSelector.value = this.searchValue;
        } else validationIsPassed = true;
        return validationIsPassed;
    }
}