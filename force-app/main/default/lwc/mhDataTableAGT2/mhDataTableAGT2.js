/*****************************************************************************
 Name: MhDataTableAGTEEEEE
================================================================================
Purpose:
This component is used to verify members in Hipaa flow for agent 2.0 UI
=================================================================================
History:
VERSION       AUTHOR                 DATE                       DETAIL
1.0           Mahesh                 3/5/2024                  Initial Dev
2.0           Veer                   05/13/2024                added comments to case table and added new table to existing cases for searched claim(only for provider)
3.0           Yasin                  06/11/2024                Added 2 tables conditionally for case if the direction is outbound. Display campaign information in table and applied pagination on both the tables.
4.0           Prashanth              07/10/2024                Modified the Claims table based on PCI enhancement
5.0           Prashanth              08/16/2024                calling controller and fetching the case based on patial hippa value
6.0           Akshay                 09/03/2024                Added Enrollment Status fields in Associated Member
7.0            Nitin                 09/10/2024                Added logice for case table to show all cases for verified members
7.1           Karunya                09/13/2024                 To Show Open household camapign cases  Datatable
8.0            Nitin                 11/14/2024                Checking not null Conditions
9.0           Seshu P                03/10/2025                 Added the row color for the existing claim attached cases.
**********************************************************************************/
import { LightningElement, api, track, wire } from 'lwc';
import fetchAccounts from '@salesforce/apex/MH_InteractionUtilsAGT2.fetchAccounts';
import fetchTriageQueueCases from '@salesforce/apex/MH_InteractionUtilsAGT2.fetchTriageQueueCases';
import fetchCases from '@salesforce/apex/MH_InteractionUtilsAGT2.fetchCases';
import fetchRedetAllCases from '@salesforce/apex/MH_InteractionUtilsAGT2.fetchRedetAllCases';
import fetchAllCasesForAllVerified from '@salesforce/apex/Mh_UpdateComplaintCase.fetchAllCases';
//import fetchInteraction from '@salesforce/apex/MH_InteractionUtilsAGT2.fetchInteraction';
import fetchAllCasesWithCampaign from '@salesforce/apex/MH_InteractionUtilsAGT2.fetchAllCasesWithCampaign';
import fetchRedetCase from '@salesforce/apex/MH_InteractionUtilsAGT2.fetchRedetCase';
import fetchCaseClaims from '@salesforce/apex/MH_InteractionUtilsAGT2.fetchCaseClaims';
import fetchHouseholdCases from '@salesforce/apex/MH_InteractionUtilsAGT2.fetchHouseholdCases';
import associateCase from '@salesforce/apex/MH_CreateCasesHelper.createCaseAGT2';
import { getFocusedTabInfo, openSubtab } from 'lightning/platformWorkspaceApi';
import getInquiryList from '@salesforce/apex/Mh_UpdateComplaintCase.getInquiryList';
import { getRecord } from 'lightning/uiRecordApi';
import CaseNumber from '@salesforce/schema/Case.CaseNumber';
import reviewDuplicateCaseClaims from '@salesforce/label/c.MH_Review_Dup_Case_Claims';
const FIELDS = ['MH_Interaction__c.Accountid__c','MH_Interaction__c.Name','MH_Interaction__c.Direction__c'];

export default class MhDataTableAGT2 extends LightningElement {
    //show the hyperlink for caseNumber - accept boolean value
    @api hyperlink;
    @api isPartialHipaa;
    @api accountId;
    @track accounts = [];
    @track triageCaseQueue = [];
    @track cases = [];
    @track caseclaim = [];
    @track provcases = [];
    @track allCasesWithCampaign = [];
    @track householdCases = [];
    columns;
    data = [];
    @track showCaseWithCampaignTable = false;
    @track showCaseTable = false;
    @track showAccountTable = false;
    @track showCaseClaimTable = false;
    @track showCaseClaimTableOnAttachScreen = false;
    @track noRecordFound = false;
    @track showProvCaseTable = false;
    @track showTriageCaseTable = false;
    @api tableName;
    @api recordId;
    @api relationshipValue;
    @api claimId;
    @api direction;
    @track currentPage = 1;
    @track rowsPerPage = 10;
    @track totalNumberOfPages;
    @track currentPageCamp = 1;
    @track rowsPerPageCamp = 10;
    @track totalNumberOfPagesCamp;
    partialVerifiedAcc = new Set();
    showredet = false;
    resultList = [];
    picklistOptions = [];
    showassociateAcc = false;
    displayLabel = {
        reviewDuplicateCaseClaims
    };
    
    ACCCOLUMNS = [
        {
            label: 'Full Name', fieldName: 'AccountURL', type: 'url',
            typeAttributes: {
                label: {
                    fieldName: 'Name'
                }
            },
            wrapText: true
        },
        { label: 'DOB', fieldName: 'MH_BirthDate__c', type: 'text', wrapText: true },
        { label: 'SSN', fieldName: 'MH_MaskedSSN__c', type: 'text', wrapText: true },
        { label: 'State-LOB', fieldName: 'StateLOB', type: 'text', wrapText: true },
        { label: 'Address', fieldName: 'Physical_Address__c', type: 'text', wrapText: true },
        { label: 'Enrollment Status', fieldName: 'MH_EnrollmentStatus__pc', type: 'text',wrapText:true,},

    ];
    CASECOLUMNS = [
        {
            label: 'Case Number', fieldName: 'CaseNumber', type: 'text',
            wrapText: true,

        },
        {
            label: 'Account Name', fieldName: 'CaseAccURL', type: 'url',
            typeAttributes: {
                label: {
                    fieldName: 'AccountName'
                }
            },
            wrapText: true
        },

        //{ label: 'Subject', fieldName: 'Subject', type: 'text', wrapText: true },
        //{ label: 'Priority', fieldName: 'Priority', type: 'text', wrapText: true },
        { label: 'Case Type', fieldName: 'MH_CaseType__c', type: 'text' },
        { label: 'Status', fieldName: 'Status', type: 'text', wrapText: true },
        { label: 'Call Outcome', fieldName: 'Call_Outcome__c', type: 'text', wrapText: true },
        { label: 'Last Modified date', fieldName: 'LastModifiedDate', type: 'text', wrapText: true }
    ];
    CASECAMPAIGNCOLUMNS = [
        {
            label: 'Case Number', fieldName: 'CaseNumber', type: 'text',
            wrapText: true,

        },
        {
            label: 'Account Name', fieldName: 'CaseAccURL', type: 'url',
            typeAttributes: {
                label: {
                    fieldName: 'AccountName'
                }
            },
            wrapText: true
        },
        {
            label: 'Campaign Name', fieldName: 'CaseCampURL', type: 'url',
            typeAttributes: {
                label: {
                    fieldName: 'CampaignName'
                }
            },
            wrapText: true
        },

        { label: 'Subject', fieldName: 'Subject', type: 'text', wrapText: true },
       // { label: 'Priority', fieldName: 'Priority', type: 'text', wrapText: true },
        { label: 'Case Type', fieldName: 'MH_CaseType__c', type: 'text' },
        { label: 'Status', fieldName: 'Status', type: 'text', wrapText: true },
        { label: 'Call Outcome', fieldName: 'Call_Outcome__c', type: 'text', wrapText: true },
        { label: 'Last Modified date', fieldName: 'LastModifiedDate', type: 'text', wrapText: true }
    ];

    HOUSEHOLDCASECAMPAIGNCOLUMNS = [
        {
            label: 'Case Number', fieldName: 'CaseNumber', type: 'text',
            wrapText: true,

        },
        {
            label: 'Account Name', fieldName: 'CaseAccURL', type: 'url',
            typeAttributes: {
                label: {
                    fieldName: 'AccountName'
                }
            },
            wrapText: true
        },
        {
            label: 'Campaign Name', fieldName: 'CaseCampURL', type: 'url',
            typeAttributes: {
                label: {
                    fieldName: 'CampaignName'
                }
            },
            wrapText: true
        },

        { label: 'Subject', fieldName: 'Subject', type: 'text', wrapText: true },
       // { label: 'Priority', fieldName: 'Priority', type: 'text', wrapText: true },
        { label: 'Case Type', fieldName: 'MH_CaseType__c', type: 'text' },
        { label: 'Status', fieldName: 'Status', type: 'text', wrapText: true },
        { label: 'Call Outcome', fieldName: 'Call_Outcome__c', type: 'text', wrapText: true },
        { label: 'Last Modified date', fieldName: 'LastModifiedDate', type: 'text', wrapText: true }
    ];

    PROVCASECOLUMNS = [
        {
            label: 'Case Number', fieldName: 'CaseNumber', type: 'text',
            wrapText: true,
        },
        {
            label: 'Account Name', fieldName: 'CaseAccURL', type: 'url',
            typeAttributes: {
                label: {
                    fieldName: 'AccountName'
                }
            },
            wrapText: true
        },
        { label: 'Case Type', fieldName: 'MH_CaseType__c', type: 'text' },
        { label: 'Status', fieldName: 'Status', type: 'text', wrapText: true },
        { label: 'Case Comments', fieldName: 'CaseComment', type: 'text' }
    ];
    CASECLAIMCOLUMNS = [
        {
            label: 'Case Number', fieldName: 'CaseNumber', type: 'text',
            typeAttributes: {
                label: {
                    fieldName: 'CaseNumber'
                }
            },
            wrapText: true,
            cellAttributes: { class: { fieldName: 'statusClass' } }

        },
        {
            label: 'Primary Inquiry', fieldName: 'PrimaryInquiryUrl', type: 'url',
            typeAttributes: {
                label: {
                    fieldName: 'PrimaryInquiryName'
                }
            },
            wrapText: true,
            cellAttributes: { class: { fieldName: 'statusClass' } }
        },
        {
            label: 'Account Name', fieldName: 'CaseAccURL', type: 'url',
            typeAttributes: {
                label: {
                    fieldName: 'AccountName'
                }
            },
            wrapText: true,
            cellAttributes: { class: { fieldName: 'statusClass' } }
        },
        {
            label: 'Claim Number', fieldName: 'ClaimNumber', type: 'text',
            wrapText: true,
            cellAttributes: { class: { fieldName: 'statusClass' } }
        },
        { label: 'Case Type', fieldName: 'MH_CaseType__c', type: 'text', wrapText: true,cellAttributes: { class: { fieldName: 'statusClass' } } },
        //{ label: 'Status', fieldName: 'Status', type: 'text', wrapText: true },
        { label: 'Case Closed Date/Time', fieldName: 'ClosedDate', type: 'text', wrapText: true,cellAttributes: { class: { fieldName: 'statusClass' } } },
        { label: 'Case Comments', fieldName: 'CaseComment', type: 'text',cellAttributes: { class: { fieldName: 'statusClass' } } }
    ];

    TRIAGEQUEUECASE = [
        {
            label: 'Case Number', fieldName: 'CaseNumberURL', type: 'url',
            typeAttributes: {
                label: {
                    fieldName: 'CaseNumber'
                }
            },
            wrapText: true,

        },
        {
            label: 'Primary Inquiry', fieldName: 'Reference_Number__c', type: 'text',
            wrapText: true
        },
        { label: 'Case Owner', fieldName: 'Mh_Case_Owner_Name__c', type: 'text', wrapText: true },
        { label: 'Status', fieldName: 'Status', type: 'text', wrapText: true }
    ];

    connectedCallback(){
        console.log('inside connectedCallback', this.tableName);
        if(this.hyperlink){
            this.CASECLAIMCOLUMNS[0] = {
                    label: 'Case Number', fieldName: 'CaseNumberURL', type: 'url',
                    typeAttributes: {
                        label: {
                            fieldName: 'CaseNumber'
                        }
                    },
                    wrapText: true,
                    cellAttributes: { class: { fieldName: 'statusClass' } }
            };
           // this.CASECLAIMCOLUMNS.splice(2,1);
        }
        if(this.tableName === 'caseTriage'){
            this.showTriageCaseTable = true;
            fetchTriageQueueCases({ accId: this.accountId })
                .then(result => {
                    this.triageCaseQueue = result;
                    (this.triageCaseQueue.length==0)?this.noRecordFound = true : this.noRecordFound = false;
                }).catch(error => {
                    console.log('Error: ' + JSON.stringify(error));
                });
        }
        if (this.tableName === 'Account') {
            this.showAccountTable = true;
            fetchAccounts({ AccId: this.accountId })
                .then(result => {
                    this.accounts = result;
                    let caseList;
                 caseList = this.accounts.find(x => x.Cases)?.Cases || [];
                    console.log('@@@accounts ' + this.accounts);
                }).catch(error => {
                    console.log('Error: ' + JSON.stringify(error));
                });

        }
        if (this.tableName === 'Case') {
            this.getInquiryListAssociate();
            //this method fetches the direction of interaction using interaction id
            this.showCaseTable = true;
            console.log('direction in case table', this.direction);
            if(this.isPartialHipaa){
                fetchRedetAllCases({ AccId: this.accountId})
                .then(result => {
                  this.cases = result;
              }).catch(error => {
               console.log('Error: ' + JSON.stringify(error));
        });
            }else{
            fetchCases({ AccId: this.accountId, direction: this.direction })
                .then(result => {
                  this.cases = result;
                  console.log('@@@Cases' + JSON.stringify(this.cases));
              }).catch(error => {
               console.log('Error: ' + JSON.stringify(error));
        });

    }
            
        }
        if (this.tableName === 'CaseCampaign') {
            if(this.isPartialHipaa){
                fetchRedetCase({ accId: this.accountId })
                .then(result => {
                    this.allCasesWithCampaign = result;
                    if (this.allCasesWithCampaign.length > 0) {
                        this.showCaseWithCampaignTable = true;
                    }
                }).catch(error => {
                    console.log('Error: ' + JSON.stringify(error));
                }); 
            }else{
            // show all cases of this member relatd to any campaign including open and completed
            fetchAllCasesWithCampaign({ accId: this.accountId })
                .then(result => {
                    this.allCasesWithCampaign = result;
                    if (this.allCasesWithCampaign.length > 0) {
                        this.showCaseWithCampaignTable = true;
                    }
                    console.log('@@@ All Cases With Campaign' + JSON.stringify(this.allCasesWithCampaign));
                }).catch(error => {
                    console.log('Error: ' + JSON.stringify(error));
                });
            }
        }
        if (this.tableName === 'householdCampaignCases') {
            console.log('Table name # ' , this.tableName);
            this.showHouseholdCampaignCases = true;
            fetchHouseholdCases({ interactionId: this.recordId })
                .then(result => {
                    this.householdCases = result;
                    console.log('@@@HouseholdCampaignCases' + JSON.stringify(this.householdCases));
                }).catch(error => {
                    console.log('Error: ' + JSON.stringify(error));
                });
        }
        if (this.tableName === 'Claims') {
            console.log('inside claim ');
            if(this.hyperlink){
                this.showCaseClaimTableOnAttachScreen = true; 
            }else{
                this.showCaseClaimTable = true;
            }
            if(this.claimId != null){
          // Fetch case claims based on the claim ID
            fetchCaseClaims({ claimId: this.claimId })
                .then(result => {
                    this.caseclaim = result;
                    if(result.length == 0 && this.hyperlink){
                        this.noRecordFound = true;
                    }
                    console.log('@@@Casesclaims' + JSON.stringify(this.caseclaim));
                }).catch(error => {
                    console.log('Error: ' + JSON.stringify(error));
                });
            }
            else if(!this.claimId && this.hyperlink){
            // No claim ID, but hyperlink is present, so set noRecordFound flag
              this.noRecordFound = true
            }
        }
        if (this.tableName === 'ProvCase') {
            this.showProvCaseTable = true;
            fetchCases({ AccId: this.accountId })
                .then(result => {
                    this.provcases = result;
                    console.log('@@@Cases' + JSON.stringify(this.provcases));
                }).catch(error => {
                    console.log('Error: ' + JSON.stringify(error));
                });
        }

    }

    get formattedTriageQueueData() {
        let currentDomain = new URL(window.location.href).origin;
        let data = this.triageCaseQueue.map(record => ({
            CaseNumberURL : `${currentDomain}/lightning/r/Case/${record.CaseId__r.Id}/view`,
            CaseNumber : record.CaseId__r.CaseNumber,
            Reference_Number__c : record.CaseId__r.MH_PrimaryInquiryId__r.Name,
            Mh_Case_Owner_Name__c : record.CaseId__r.Mh_Case_Owner_Name__c,
            Status : record.CaseId__r.Status
        }));
        // Calculate the total number of pages
        this.totalNumberOfPages = Math.ceil(data.length / 5);

        // Get the data for the current page
        let start = (this.currentPage - 1) * 5;
        let end = this.currentPage * 5;
        return data.slice(start, end);
    }

    //To format associated members data in table columns
    get formattedAcountData() {
        let currentDomain = new URL(window.location.href).origin;
        console.log('inside formattedAcountData');
        return this.accounts.map(record => ({
            ...record,
            MH_MaskedSSN__c: record.MH_MaskedSSN__c ? record.MH_MaskedSSN__c.slice(-4) : '',
            StateLOB: record.MH_HealthPlanState__c + '-' + record.MH_Line_of_Business__c,
            AccountURL: `${currentDomain}/lightning/r/Account/${record.Id}/view`
        }));
    }
    /*To format open cases data into table columns
    get formattedCaseData() {
        let currentDomain = new URL(window.location.href).origin;
        return this.cases.map(record => ({
            ...record,
            CaseAccURL: `${currentDomain}/lightning/r/Account/${record.AccountId}/view`,
            AccountName: record.Account.Name
        }));
    }*/
    //To format all cases data into table columns
    get formattedCaseData() {
        let currentDomain = new URL(window.location.href).origin;
        let data = this.cases.map(record => {
            return {
                ...record,
                CaseAccURL: `${currentDomain}/lightning/r/Account/${record.AccountId}/view`,
                AccountName: record.Account ? record.Account.Name : '',
            }
        });
     this.rowsPerPage = 5;
        // Calculate the total number of pages
        this.totalNumberOfPages = Math.ceil(data.length / this.rowsPerPage);

        // Get the data for the current page
        let start = (this.currentPage - 1) * this.rowsPerPage;
        let end = this.currentPage * this.rowsPerPage;
        return data.slice(start, end);
    }

    //To format all cases with Campaign data into table columns
    get formattedAllCaseWithCampaignData() {
        let currentDomain = new URL(window.location.href).origin;
        let data = this.allCasesWithCampaign.map(record => {
            return {
                ...record,
                CaseAccURL: `${currentDomain}/lightning/r/Account/${record.AccountId}/view`,
                AccountName: record.Account ? record.Account.Name : '',
                CaseCampURL: record.MH_Campaign__c ? `${currentDomain}/lightning/r/Campaign/${record.MH_Campaign__c}/view` : '',
                CampaignName: record.MH_Campaign__c ? record.MH_Campaign__r.Name : ''
            }
        });

        // Calculate the total number of pages
        this.totalNumberOfPagesCamp = Math.ceil(data.length / this.rowsPerPageCamp);

        // Get the data for the current page
        let start = (this.currentPageCamp - 1) * this.rowsPerPageCamp;
        let end = this.currentPageCamp * this.rowsPerPageCamp;
        return data.slice(start, end);
    }


    //To format all Household Campaign cases into table columns
    get formattedHouseholdCampaignCases() {
        let currentDomain = new URL(window.location.href).origin;
        let data = this.householdCases.map(record => {
            return {
                ...record,
                CaseAccURL: `${currentDomain}/lightning/r/Account/${record.AccountId}/view`,
                AccountName: record.Account ? record.Account.Name : '',
                CaseCampURL: record.MH_Campaign__c ? `${currentDomain}/lightning/r/Campaign/${record.MH_Campaign__c}/view` : '',
                CampaignName: record.MH_Campaign__c ? record.MH_Campaign__r.Name : ''
            }
        });

        // Calculate the total number of pages
        this.totalNumberOfPagesCamp = Math.ceil(data.length / this.rowsPerPageCamp);

        // Get the data for the current page
        let start = (this.currentPageCamp - 1) * this.rowsPerPageCamp;
        let end = this.currentPageCamp * this.rowsPerPageCamp;
        return data.slice(start, end);
    }

    get isOnFirstPageCamp() {
        return this.currentPageCamp === 1;
    }

    get isOnLastPageCamp() {
        return this.currentPageCamp === this.totalNumberOfPagesCamp;
    }

    handlePreviousCamp() {
        if (this.currentPageCamp > 1) {
            this.currentPageCamp--;
        }
    }

    handleNextCamp() {
        if (this.currentPageCamp < this.totalNumberOfPagesCamp) {
            this.currentPageCamp++;
        }
    }


    get formattedCaseClaimData() {
        let currentDomain = new URL(window.location.href).origin;
        if(this.hyperlink){
           let data = this.caseclaim.map(record => ({
                ...record,
                CaseNumberURL: `${currentDomain}/lightning/r/Case/${record.Id}/view`,
                CaseNumber: record.CaseNumber,
                CaseAccURL: `${currentDomain}/lightning/r/Account/${record.AccountId}/view`,
                AccountName: record.Account.Name,
                PrimaryInquiryUrl :  record.MH_PrimaryInquiryId__c ? `${currentDomain}/lightning/r/MH_Inquiry__c/${record.MH_PrimaryInquiryId__c}/view` : '',
                PrimaryInquiryName : record.MH_PrimaryInquiryId__c ? record.MH_PrimaryInquiryId__r.Name : '',
                CaseComment: record.CaseComments && record.CaseComments.length > 0 ? record.CaseComments[0].CommentBody : '',
                ClaimNumber: this.claimId,
                ClosedDate : record.ClosedDate ? this.formatDate(record.ClosedDate) : '',
                statusClass: record.Status === 'Open' ? 'slds-icon-custom-custom46 slds-text-color_default' : ''
            }));
            this.totalNumberOfPages = Math.ceil(data.length / 5);

            // Get the data for the current page
            let start = (this.currentPage - 1) * 5;
            let end = this.currentPage * 5;
            return data.slice(start, end);
        }else{
        return this.caseclaim.map(record => ({
            ...record,
            CaseAccURL: `${currentDomain}/lightning/r/Account/${record.AccountId}/view`,
            AccountName: record.Account.Name,
            CaseComment: record.CaseComments && record.CaseComments.length > 0 ? record.CaseComments[0].CommentBody : '',
            ClosedDate : record.ClosedDate ? this.formatDate(record.ClosedDate) : '',
            PrimaryInquiryUrl : record.MH_PrimaryInquiryId__c ? `${currentDomain}/lightning/r/MH_Inquiry__c/${record.MH_PrimaryInquiryId__c}/view` : '',
            PrimaryInquiryName : record.MH_PrimaryInquiryId__c ? record.MH_PrimaryInquiryId__r.Name : '',
            ClaimNumber: this.claimId,
            statusClass: record.Status === 'Open' ? 'slds-icon-custom-custom46 slds-text-color_default' : ''

        }));
    }
    }


    //To format open cases data into table columns for provider case
    get formattedProvCaseData() {
        let currentDomain = new URL(window.location.href).origin;
        let data = this.provcases.map(record => {
            return {
                ...record,
                CaseAccURL: `${currentDomain}/lightning/r/Account/${record.AccountId}/view`,//use navigate
                AccountName: record.Account.Name,
                CaseComment: record.CaseComments && record.CaseComments.length > 0 ? record.CaseComments[0].CommentBody : '',
            };
        });

        // Calculate the total number of pages
        this.totalNumberOfPages = Math.ceil(data.length / this.rowsPerPage);

        // Get the data for the current page
        let start = (this.currentPage - 1) * this.rowsPerPage;
        let end = this.currentPage * this.rowsPerPage;
        return data.slice(start, end);
    }

    get isOnFirstPage() {
        return this.currentPage === 1;
    }

    get isOnLastPage() {
        return this.currentPage === this.totalNumberOfPages;
    }

    handlePrevious() {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }

    handleNext() {
        if (this.currentPage < this.totalNumberOfPages) {
            this.currentPage++;
        }
    }

    // on selection of case associate case with that interaction
    handlerowSelection(event) {
        const selectedRows = event.detail.selectedRows;
        const selectedRow = selectedRows[0];
        let casecreate = {};
        console.log('@@@selectedRow', selectedRow);
        if (selectedRow.Status === 'Open' || selectedRow.Status === 'New') {
            casecreate = {
                interactionId: this.recordId,
                CaseId: selectedRow.Id,
                relationShip: this.relationshipValue,
            };
            const caseObj = JSON.stringify(casecreate);
            console.log('@@@caseObj', caseObj);

            // create a case with the above input
            associateCase({ data: caseObj })
                .then(result => {
                    const { caseCreated, error } = result;
                    if (caseCreated && caseCreated.length > 0) {
                        console.log('@@@caseCreated', caseCreated[0].Id);
                        this.handleOpenSubTab(caseCreated[0].Id);
                    }
                    else if (error) {
                        console.log('Error:', error);
                    }
                })
                .catch(error => {
                    console.log('Error:', error);
                });
        }
        else {
            console.log('else part');
            this.handleOpenSubTab(selectedRow.Id);
        }

    }

    // open case in subtab
    async handleOpenSubTab(caseId) {
        let focusedTabInfo = await getFocusedTabInfo();
        openSubtab(focusedTabInfo.tabId, {
            recordId: caseId,
            focus: true
        });
    }
 // get inquiry list for associated members 
    getInquiryListAssociate() {
                    // fetch all cases for all verified members
                    fetchAllCasesForAllVerified({ interactionId: this.recordId, direction: this.direction  })
                        .then(result => {
                            console.log('Case List' + JSON.stringify(result));
                            this.cases = result;
                        }).catch(error => {
                            console.log('Error: ' + JSON.stringify(error));
                        });
                }

    
                formatDate(dateString) {
                    if (!dateString) return '';
                    const date = new Date(dateString);
                    const options = { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: true 
                    };
                    return new Intl.DateTimeFormat('en-US', options).format(date);
                }

}