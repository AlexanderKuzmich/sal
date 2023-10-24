@IsTest
public class ABI_SFA_GenericSearchRecordController_TC {

    private static final String OBJECT_CONTACT = 'Contact';
    private static final String OBJECT_OR_FIELD_NOT_EXISTS = 'NotExists';
    private static final String FIELD_ID = 'Id';
    private static final List<String> FIELDS_LAST_NAME = new List<String>{'LastName'};
    private static final List<String> FIELDS_FIRST_AND_LAST_NAME = new List<String>{'FirstName', 'LastName'};
    private static final String SEARCH_STRING_1 = 'tac';
    private static final String SEARCH_STRING_2 = 'abc';
    private static final String SEARCH_STRING_3 = 'con';
    private static final Integer RECORDS_COUNT_1 = 1;
    private static final String VALUE_ACONBAZ = 'aconbaz';
    private static final String COMMON_FIELD = 'CommonField__c';

    @TestSetup
    static void setup() {

        Contact contact1 = new Contact(FirstName = 'test', LastName = 'contact');
        Contact contact2 = new Contact(FirstName = 'another', LastName = 'contact');
        Contact contact3 = new Contact(FirstName = 'actor', LastName = 'aconbaz');

        insert new List<SObject>{contact1, contact2, contact3};
    }

    @IsTest
    public static void testGetRecords_Returns_FoundObjects() {
        // Act
        List<SObject> sObjects = ABI_SFA_GenericSearchRecordController.getRecords(SEARCH_STRING_1, OBJECT_CONTACT, FIELD_ID, FIELDS_LAST_NAME, null, null, COMMON_FIELD, null);

        // Assert
        System.assertEquals(2, sObjects.size(), 'getRecords should return two found objects');
    }

    @IsTest
    public static void testGetRecords_Returns_LimitedFoundObjects() {
        // Act
        List<SObject> sObjects = ABI_SFA_GenericSearchRecordController.getRecords(SEARCH_STRING_1, OBJECT_CONTACT, FIELD_ID, FIELDS_LAST_NAME, null, null, COMMON_FIELD, RECORDS_COUNT_1);

        // Assert
        System.assertEquals(1, sObjects.size(), 'getRecords should return one found objects (because of limit)');
    }

    @IsTest
    public static void testGetRecords_Returns_EmptyList_WhenNoMatchesExists() {
        // Act
        List<SObject> sObjects = ABI_SFA_GenericSearchRecordController.getRecords(SEARCH_STRING_2, OBJECT_CONTACT, FIELD_ID, FIELDS_LAST_NAME, null, '', COMMON_FIELD, RECORDS_COUNT_1);

        // Assert
        System.assertEquals(0, sObjects.size(), 'getRecords() should return empty list when no matched object exists.');
    }

    @IsTest
    public static void testGetRecords_WithExtendedWhereClause_Returns_FoundObject() {
        // Act
        List<SObject> sObjects = ABI_SFA_GenericSearchRecordController.getRecords(SEARCH_STRING_1, OBJECT_CONTACT, FIELD_ID, FIELDS_LAST_NAME, null,'{"FirstName":"test"}', COMMON_FIELD, RECORDS_COUNT_1);

        // Assert
        System.assertEquals(1, sObjects.size(), 'getRecords() should return one found object that matches the ExtendedWhereClause condition.');
    }

    @IsTest
    public static void testGetRecords_WithExtendedWhereClause_Returns_EmptyList_WhenNoMatchesExists() {
        // Act
        List<SObject> sObjects = ABI_SFA_GenericSearchRecordController.getRecords(SEARCH_STRING_1, OBJECT_CONTACT, FIELD_ID, FIELDS_LAST_NAME, null, '{"Title":"test"}', COMMON_FIELD, RECORDS_COUNT_1);

        // Assert
        System.assertEquals(0, sObjects.size(), 'getRecords() should return empty list when no matched object exists by the ExtendedWhereClause condition.');
    }

    @IsTest
    public static void testGetRecords_WithExtendedWhereClause_AsArray_Returns_FoundObject() {
        // Act
        List<SObject> sObjects = ABI_SFA_GenericSearchRecordController.getRecords(SEARCH_STRING_3, OBJECT_CONTACT, FIELD_ID, FIELDS_LAST_NAME, null, '{"FirstName":["test","actor"]}', COMMON_FIELD, null);

        // Assert
        System.assertEquals(2, sObjects.size(), 'getRecords() should return two found objects when param ExtendedWhereClause used with param ExtendedWhereClause as array used .');
    }

    @IsTest
    public static void testGetRecords_WithEmptyExtendedWhereClause_Returns_FoundObject() {
        // Act
        List<SObject> sObjects = ABI_SFA_GenericSearchRecordController.getRecords(SEARCH_STRING_3, OBJECT_CONTACT, FIELD_ID, FIELDS_LAST_NAME, null, '{}', COMMON_FIELD, null);

        // Assert
        System.assertEquals(3, sObjects.size(), 'getRecords() should return three found objects when empty "{}" param ExtendedWhereClause used .');
    }

    @IsTest
    public static void testGetRecords_WithExtendedWhereClause_withExtraApiNames_AsArray_Returns_FoundObject() {
        // Act
        List<Contact> contacts = ABI_SFA_GenericSearchRecordController.getRecords(VALUE_ACONBAZ, OBJECT_CONTACT, FIELD_ID, FIELDS_LAST_NAME, FIELDS_FIRST_AND_LAST_NAME, null, COMMON_FIELD, RECORDS_COUNT_1);

        // Assert
        System.assertEquals(1, contacts.size(), 'getRecords() should return one found object.');
        System.assertNotEquals(null, contacts[0].Id, 'getRecords() should return found objects with Id field fetched.');
        System.assertEquals('actor', contacts[0].FirstName, 'getRecords() should return objects with all the fields from valueFieldApiNames list fetched. FirstName is missing.');
        System.assertEquals('aconbaz', contacts[0].LastName, 'getRecords() should return objects with all the fields from valueFieldApiNames list fetched. LastName is missing.');
    }

    @IsTest
    public static void testGetRecords_ThrowsAuraHandledException_WhenNoSuchObjectExists() {
        // Arrange
        Boolean result = false;
        try {
            // Act
            ABI_SFA_GenericSearchRecordController.getRecords(SEARCH_STRING_2, OBJECT_OR_FIELD_NOT_EXISTS, FIELD_ID, FIELDS_LAST_NAME, null,'', COMMON_FIELD, RECORDS_COUNT_1);
        } catch (AuraHandledException auraHandledException) {
            result = true;
        }

        // Assert
        System.assert(result, 'AuraHandledException should be thrown when the "objectApiName" points to non-existing object. ');
    }

    @IsTest
    public static void testGetRecords_ThrowsAuraHandledException_WhenValueFieldApiNames_isNotSet() {
        // Arrange
        Boolean result = false;
        try {
            // Act
            ABI_SFA_GenericSearchRecordController.getRecords(SEARCH_STRING_2, OBJECT_CONTACT, FIELD_ID, null, null,null, COMMON_FIELD, null);
        } catch (AuraHandledException auraHandledException) {
            result = true;
        }

        // Assert
        System.assert(result, 'AuraHandledException should be thrown when param \'valueFieldApiNames\' is not set. ');
    }

    @IsTest
    public static void testGetRecords_ThrowsAuraHandledException_WhenValueFieldApiNames_isEmpty() {
        // Arrange
        Boolean result = false;
        try {
            // Act
            ABI_SFA_GenericSearchRecordController.getRecords(SEARCH_STRING_2, OBJECT_CONTACT, FIELD_ID, new List<String>(), null,null, COMMON_FIELD, null);
        } catch (AuraHandledException auraHandledException) {
            result = true;
        }

        // Assert
        System.assert(result, 'AuraHandledException should be thrown when param \'valueFieldApiNames\' is empty. ');
    }

    @IsTest
    public static void testGetRecords_ThrowsAuraHandledException_WhenSOQLException_IsBeenThrown() {
        // Arrange
        Boolean result = false;
        try {
            // Act
            ABI_SFA_GenericSearchRecordController.getRecords(SEARCH_STRING_2, OBJECT_CONTACT, OBJECT_OR_FIELD_NOT_EXISTS, FIELDS_LAST_NAME, null,null, COMMON_FIELD, null);
        } catch (AuraHandledException auraHandledException) {
            result = true;
        }

        // Assert
        System.assert(result, 'AuraHandledException should be thrown when param \'valueFieldApiNames\' is empty. ');
    }
}