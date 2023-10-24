public with sharing class ABI_SFA_GenericSearchRecordController {

    private static final Integer MAX_RECORDS_DEFAULT_VALUE = 10;

    @AuraEnabled(Cacheable=true)
    public static List<SObject> getRecords(String searchString, String objectApiName, String idFieldApiName, List<String> valueFieldApiNames, List<String> extraFieldApiNames, String extendedWhereClause, String commonFieldForSearch, Integer maxRecords) {

        objectApiName = String.escapeSingleQuotes(objectApiName);
        if (String.isBlank(objectApiName) || !ABI_SFA_GenericSearchRecordHelper.isObjectExist(objectApiName)) {
            throw new AuraHandledException('No such SObject exists: ' + objectApiName + '.');
        }

        if (null == valueFieldApiNames || valueFieldApiNames.isEmpty()) {
            throw new AuraHandledException('Param \'valueFieldApiNames\' list should have at least one item.');
        }

        if (null == maxRecords) {
            maxRecords = MAX_RECORDS_DEFAULT_VALUE;
        }

        searchString = String.escapeSingleQuotes(searchString);
        idFieldApiName = String.escapeSingleQuotes(idFieldApiName);
        List<String> whereClauses;
        if(String.isNotBlank(commonFieldForSearch) && hasSObjectField(commonFieldForSearch, objectApiName) && valueFieldApiNames.contains(commonFieldForSearch)) {
            whereClauses = new List<String>{ABI_SFA_GenericSearchRecordHelper.buildMainWhereClauseWithCommonFieldForSearch(searchString, commonFieldForSearch)};
        }
        else {
            whereClauses = new List<String>{
                    ABI_SFA_GenericSearchRecordHelper.buildMainWhereClause(searchString, valueFieldApiNames)
            };
        }
        if (!String.isBlank(extendedWhereClause)) {
            Map<String, Object> filters = (Map<String, Object>) JSON.deserializeUntyped(String.escapeSingleQuotes(extendedWhereClause));
            extendedWhereClause = ABI_SFA_GenericSearchRecordHelper.buildExtendedWhereClause(filters);
            if (!String.isBlank(extendedWhereClause)) {
                whereClauses.add(extendedWhereClause);
            }
        }

        String query = 'SELECT ' + ABI_SFA_GenericSearchRecordHelper.buildSelectList(idFieldApiName, valueFieldApiNames, extraFieldApiNames)
                + ' FROM ' + String.escapeSingleQuotes(objectApiName)
                + ' WHERE '
                + String.join(whereClauses, ABI_SFA_Constant_Class.SPACE + ABI_SFA_Constant_Class.STRING_AND + ABI_SFA_Constant_Class.SPACE)
                + ' LIMIT ' + maxRecords;
        try {
            return Database.query(query);
        } catch (Exception apexException) {
            AuraHandledException auraHandledException = new AuraHandledException(apexException.getMessage());
            auraHandledException.initCause(apexException);
            throw auraHandledException;
        }
    }

    private static Boolean hasSObjectField(String fieldName, String objectApiName){
        SObject so = Schema.getGlobalDescribe().get(objectApiName).newSObject();
        return so.getSobjectType().getDescribe().fields.getMap().keySet().contains(fieldName.toLowerCase());
    }

    @AuraEnabled(Cacheable=true)
    public static RecordsWithInitialSearchStringWrapper getRecordsWithInitialSearchString(String searchString, String objectApiName, String idFieldApiName, List<String> valueFieldApiNames, List<String> extraFieldApiNames, String extendedWhereClause, String commonFieldForSearch, Integer maxRecords) {
        RecordsWithInitialSearchStringWrapper recordsWrapper = new RecordsWithInitialSearchStringWrapper();

        recordsWrapper.records = getRecords(searchString, objectApiName, idFieldApiName, valueFieldApiNames, extraFieldApiNames, extendedWhereClause, commonFieldForSearch, maxRecords);
        recordsWrapper.searchString = searchString;

        return recordsWrapper;
    }

    public class RecordsWithInitialSearchStringWrapper {
        @AuraEnabled public List<SObject> records {get;set;}
        @AuraEnabled public String searchString {get;set;}
    }
}