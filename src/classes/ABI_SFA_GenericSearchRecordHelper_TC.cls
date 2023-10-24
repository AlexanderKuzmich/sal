@IsTest
public with sharing class ABI_SFA_GenericSearchRecordHelper_TC {

    private static final String OBJECT_CONTACT = 'Contact';
    private static final String OBJECT_NONE = 'NotExistingObject';
    private static final String FIELD_ID = 'Id';
    private static final String FIELD_NAME = 'Name';
    private static final String FIELD_2 = 'Field2';
    private static final String FIELD_3 = 'Field3';
    private static final String VALUE_ABC = 'abc';
    private static final String VALUE_EFG = 'efg';

    @IsTest
    public static void testBuildSelectListWithExtraFieldApiNames() {
        // Arrange
        String idFieldApiName = FIELD_ID;
        List<String> valueFieldApiNames = new List<String>{
                FIELD_NAME
        };
        List<String> extraFieldApiNames = new List<String>{
                FIELD_2, FIELD_3
        };

        // Act
        String selectList = ABI_SFA_GenericSearchRecordHelper.buildSelectList(idFieldApiName, valueFieldApiNames, extraFieldApiNames);

        // Assert
        System.assertEquals('Field2, Field3, Id, Name', selectList, 'Select list should be well formatted');
    }

    @IsTest
    public static void testBuildSelectListNoExtraFieldApiNames() {
        // Arrange
        String idFieldApiName = FIELD_ID;
        List<String> valueFieldApiNames = new List<String>{
                FIELD_NAME
        };
        List<String> extraFieldApiNames = null;

        // Act
        String selectList = ABI_SFA_GenericSearchRecordHelper.buildSelectList(idFieldApiName, valueFieldApiNames, extraFieldApiNames);

        // Assert
        System.assertEquals('Id, Name', selectList, 'Select list should be well formatted');
    }

    @IsTest
    public static void testBuildMainWhereClause() {
        // Arrange
        String searchString = VALUE_ABC;
        List<String> valueFieldApiNames = new List<String>{
                FIELD_2, FIELD_3
        };

        // Act
        String selectList = ABI_SFA_GenericSearchRecordHelper.buildMainWhereClause(searchString, valueFieldApiNames);

        // Assert
        System.assertEquals(' ( Field2 like \'%abc%\' OR Field3 like \'%abc%\' ) ', selectList, 'Select list should be well formatted');
    }

    @IsTest
    public static void testBuildExtendedWhereClauseNull() {
        // Arrange
        Map<String, Object> extendedWhereClause = null;

        // Act
        String extendedWhereClauseString = ABI_SFA_GenericSearchRecordHelper.buildExtendedWhereClause(extendedWhereClause);

        // Assert
        System.assertEquals('', extendedWhereClauseString, 'extendedWhereClauseString should empty string when null argument provided');
    }

    @IsTest
    public static void testBuildExtendedWhereClauseMap() {
        // Arrange
        Map<String, Object> extendedWhereClause = new Map<String, Object>{
                FIELD_NAME => VALUE_ABC,
                FIELD_ID => VALUE_EFG
        };

        // Act
        String extendedWhereClauseString = ABI_SFA_GenericSearchRecordHelper.buildExtendedWhereClause(extendedWhereClause);

        // Assert
        System.assertEquals(' Name=\'abc\' AND Id=\'efg\'', extendedWhereClauseString, 'extendedWhereClauseString should be well formatted argument with simple values provided');
    }


    @IsTest
    public static void testBuildExtendedWhereClauseMapArray() {
        // Arrange
        List<String> values = new List<String>{
                VALUE_ABC, VALUE_EFG
        };
        Map<String, Object> extendedWhereClause = new Map<String, Object>{
                FIELD_NAME => values
        };

        // Act
        String extendedWhereClauseString = ABI_SFA_GenericSearchRecordHelper.buildExtendedWhereClause(extendedWhereClause);

        // Assert
        System.assertEquals(' Name IN( \'abc\',\'efg\' )', extendedWhereClauseString, 'extendedWhereClauseString should be well formatted argument with multiple values provided');
    }

    @IsTest
    public static void testIsObjectExist() {
        // Arrange
        String objectName = OBJECT_CONTACT;

        // Act
        Boolean result = ABI_SFA_GenericSearchRecordHelper.isObjectExist(objectName);

        // Assert
        System.assert(result, 'IsObjectExist should return true on existing objects');
    }

    @IsTest
    public static void testIsObjectExistNotExisting() {
        // Arrange
        String objectName = OBJECT_NONE;

        // Act
        Boolean result = ABI_SFA_GenericSearchRecordHelper.isObjectExist(objectName);

        // Assert
        System.assertNotEquals(true, result, 'IsObjectExist should false true on existing objects');
    }
}