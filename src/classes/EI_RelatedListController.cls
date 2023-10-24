public with sharing class EI_RelatedListController {

	@AuraEnabled (Cacheable = true)
	public static List<SObject> getRelatedListData(String configurations) {

		try {
			Map<String, Object> configurationsByNames = (Map<String, Object>) JSON.deserializeUntyped(configurations);
			EI_RelatedListService service = new EI_RelatedListService(configurationsByNames);
			return service.getRecords();
		} catch (JSONException jsonExc) {
			throw new InvalidParametersException(Label.ABI_SFA_Component_Parameters_Invalid);
		} 
	}

	@AuraEnabled (Cacheable = true)
	public static String getChildRelationshipName(String childSObjectName, Id parentRecordId, String relationFieldName) {

		DescribeSObjectResult sObjectDescribe = parentRecordId.getSobjectType().getDescribe();
		if (sObjectDescribe != null) {
			for (ChildRelationship relation : sObjectDescribe.getChildRelationships()) {
				if (String.valueOf(relation.getChildSObject()) == childSObjectName && String.valueOf(relation.getField()) == relationFieldName) {
					return relation.getRelationshipName();
				}
			}
		}

		return null;
	}

	public class InvalidParametersException extends Exception {
	}
}