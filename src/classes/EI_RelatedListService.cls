public inherited sharing class EI_RelatedListService {

	public static final String SOBJECT_NAME = 'sObjectName';
	public static final String PARENT_FIELD_NAME = 'parentFieldName';
	public static final String RECORD_ID = 'recordId';
	public static final String FIELDS_NAMES = 'fieldsNames';
	public static final String ADDITIONAL_WHERE_CLAUSE = 'additionalWhereClause';
	public static final String MAX_NUMBER_OF_RECORDS = 'maxNumberOfRecords';
	public static final String DEFAULT_SORT_FIELD = 'defaultSortField';
	public static final String SORT_FIELD = 'sortField';
	public static final String DEFAULT_SORT_DIRECTION = 'defaultSortDirection';
	public static final String SORT_DIRECTION = 'sortDirection';
	public static final String SHOW_ALL_RECORDS_ON_THE_SAME_PAGE = 'showAllRecordsOnTheSamePage';

	private String sObjectName;
	private List<String> fieldsNames; 

	private Map<String, Object> configurations;

	public EI_RelatedListService(Map<String, Object> configurations) {
		this.configurations = configurations;
	}

	public List<SObject> getRecords() {
		this.sObjectName = String.valueOf(configurations.get(SOBJECT_NAME));
		this.fieldsNames = new List<String>();
		for (String field_i : (List<String>) JSON.deserialize(JSON.serialize(configurations.get(FIELDS_NAMES)), List<String>.class)) {
			if(String.isNotBlank(field_i)) {
				this.fieldsNames.add(field_i);
			}
		}
		String parentIdFieldName = String.valueOf(configurations.get(PARENT_FIELD_NAME));
		String recordId = String.valueOf(configurations.get(RECORD_ID));
		String additionalWhereClause = String.valueOf(configurations.get(ADDITIONAL_WHERE_CLAUSE));
		List<String> sortFields = String.isNotBlank(String.valueOf(configurations.get(SORT_FIELD))) ?
				String.valueOf(configurations.get(SORT_FIELD)).split(';') :
				String.valueOf(configurations.get(DEFAULT_SORT_FIELD)).split(';');
		List<String> sortDirections = String.isNotBlank(String.valueOf(configurations.get(SORT_DIRECTION))) ?
				String.valueOf(configurations.get(SORT_DIRECTION)).split(';') :
				String.valueOf(configurations.get(DEFAULT_SORT_DIRECTION)).split(';');
		Integer maxNumberOfRecords = Integer.valueOf(configurations.get(MAX_NUMBER_OF_RECORDS));
		Boolean showAllRecordsOnTheSamePage = configurations.containsKey(SHOW_ALL_RECORDS_ON_THE_SAME_PAGE)
			? Boolean.valueOf(configurations.get(SHOW_ALL_RECORDS_ON_THE_SAME_PAGE)) : false;
		this.fieldsNames = (fieldsNames == null || fieldsNames.isEmpty() ? new List<String>{
				'Name'
		} : fieldsNames);

		List<String> orderByConditions;
		if(sortFields != null && sortDirections != null && !sortFields.isEmpty() && !sortDirections.isEmpty() && sortFields.size() == sortDirections.size()) {
			orderByConditions = new List<String>();
			for(Integer i = 0; i < sortFields.size(); i++) {
				orderByConditions.add(sortFields.get(i) + ' ' + sortDirections.get(i));
			}
		}

		String limitPartOfQuery = 'LIMIT ';
		if (maxNumberOfRecords != null && !showAllRecordsOnTheSamePage) {
			limitPartOfQuery += String.valueOf(maxNumberOfRecords);
		} else {
			limitPartOfQuery += '10000';
		}

		String query = String.join(
				new List<String>{
						'SELECT',
						String.join(this.fieldsNames, ','),
						'FROM', this.sObjectName,
                        'WHERE', getParentClause(parentIdFieldName),
						(String.isBlank(additionalWhereClause) ? '' : 'AND ' + additionalWhereClause),
						(orderByConditions != null ? String.join(new List<String>{
								'ORDER BY', String.join(orderByConditions, ', ')
						}, ' ') : ''),
						limitPartOfQuery
				}, ' ');

		return Database.query(query);
	}

    private static String getParentClause(String parentIdFIeldName) {
        String pattern = '{0} = :recordId';
        List<String> parentIdFIeldNames;
        if (!parentIdFIeldName.contains(',')) {
            parentIdFIeldNames = new List<String>{parentIdFIeldName};
        } else {
            parentIdFIeldNames = parentIdFIeldName.remove('[').remove(']').remove(' ').split(',');
            for (Integer i = 1; i < parentIdFIeldNames.size(); i++) {
                pattern += ' OR {' + i + '} = :recordId';
            }
            pattern = '(' + pattern + ')';
        }

        return String.format(pattern, parentIdFIeldNames);
    }
}