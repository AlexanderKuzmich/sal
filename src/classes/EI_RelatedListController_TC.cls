@IsTest
private class EI_RelatedListController_TC {

	@TestSetup
	static void setup() {
		Account parent = ABI_SFA_TestDataHelper.getAccount(ABI_SFA_Constant_Class.STRING_ACC_SHIP_TO_RECORDTYPE, ABI_SFA_TestDataHelper.ACCOUNT_COUNTRY_DE, 'M1 Account');
		insert parent;
		Contact childFirst = ABI_SFA_TestDataHelper.getContact();
		childFirst.AccountId = parent.Id;
		childFirst.FirstName = 'ABC';
		Contact childSecond = ABI_SFA_TestDataHelper.getContact();
		childSecond.AccountId = parent.Id;
		insert new List<Contact> {childFirst, childSecond}; 
	}

	@IsTest
	static void getRelatedListData_InvalidJSON_Test() {

		String configurations = '{""}';
		Boolean exceptionThrown = false;
		Test.startTest();
		try {
			EI_RelatedListController.getRelatedListData(configurations);
		} catch (EI_RelatedListController.InvalidParametersException exc) {
			exceptionThrown = true;
		}
		Test.stopTest();

		System.assert(exceptionThrown);
	}

	@IsTest
	static void getRelatedListData_Positive_Test() {

		Account parent = [SELECT Id, Name FROM Account LIMIT 1];
		Map<String, Object> configurationsByNames = new Map<String, Object>();
		configurationsByNames.put(EI_RelatedListService.DEFAULT_SORT_DIRECTION, 'desc');
		configurationsByNames.put(EI_RelatedListService.DEFAULT_SORT_FIELD, 'Name');
		configurationsByNames.put(EI_RelatedListService.MAX_NUMBER_OF_RECORDS, 2);
		configurationsByNames.put(EI_RelatedListService.ADDITIONAL_WHERE_CLAUSE, 'Name LIKE \'%ABC%\'');
		configurationsByNames.put(EI_RelatedListService.SOBJECT_NAME, 'Contact');
		configurationsByNames.put(EI_RelatedListService.PARENT_FIELD_NAME, 'AccountId');
		configurationsByNames.put(EI_RelatedListService.RECORD_ID, parent.Id);
		configurationsByNames.put(EI_RelatedListService.FIELDS_NAMES, new List<String>{'Account.Name', 'Name', 'LastName'});
		String configurations = JSON.serialize(configurationsByNames);
		Test.startTest();
		List<Contact> records = EI_RelatedListController.getRelatedListData(configurations);
		Test.stopTest();

		List<Contact> contacts = [SELECT Id, Name, LastName FROM Contact WHERE FirstName = 'ABC'];
		System.assertEquals(1, records.size());
		System.assertEquals(contacts[0].Name, records[0].Name);
		System.assertEquals(contacts[0].LastName, records[0].LastName);
		System.assertEquals(parent.Name, records[0].Account.Name);
	}

	@IsTest
	static void getChildRelationshipName_ChildExist_Test() {

		Account parent = [SELECT Id, Name FROM Account LIMIT 1];
		Test.startTest();
		String childName = EI_RelatedListController.getChildRelationshipName('Contact', parent.Id, 'AccountId');
		Test.stopTest();

		System.assertEquals('Contacts', childName);
	}

	@IsTest
	static void getChildRelationshipName_ChildNotExist_Test() {

		Account parent = [SELECT Id, Name FROM Account LIMIT 1];
		Test.startTest();
		String childName = EI_RelatedListController.getChildRelationshipName('Contact', parent.Id, 'Account');
		Test.stopTest();

		System.assertEquals(null, childName);
	}
}