public with sharing class ABI_SFA_GenericSearchRecordHelper {

    public static String buildSelectList(String idFieldApiName, final List<String> valueFieldApiNames, final List<String> extraFieldApiNames) {

        Set<String> fieldSet = new Set<String>(valueFieldApiNames);
        fieldSet.add(idFieldApiName);

        if (null != extraFieldApiNames) {
            fieldSet.addAll(extraFieldApiNames);
        }

        List<String> fields = new List<String>();
        
        for(String field : fieldSet) {
            fields.add(String.escapeSingleQuotes(field));
        }
        
        fields.sort();

        return String.join(fields, ABI_SFA_Constant_Class.STRING_COMMA + ABI_SFA_Constant_Class.SPACE);
    }

    public static String buildMainWhereClause(String searchString, final List<String> valueFieldApiNames) {

        String result = '';

        List<String> mainWhereClauses = new List<String>();
        for (String field : valueFieldApiNames) {
            mainWhereClauses.add(String.escapeSingleQuotes(field) + ABI_SFA_Constant_Class.STRING_LIKE + ABI_SFA_Constant_Class.STRING_APOSTROPHE + ABI_SFA_Constant_Class.STRING_PERCENT
                    + searchString
                    + ABI_SFA_Constant_Class.STRING_PERCENT + ABI_SFA_Constant_Class.STRING_APOSTROPHE);
        }

        result = ABI_SFA_Constant_Class.SPACE + ABI_SFA_Constant_Class.STRING_LEFT_BRACKET
                + String.join(mainWhereClauses, ABI_SFA_Constant_Class.SPACE + ABI_SFA_Constant_Class.STRING_OR + ABI_SFA_Constant_Class.SPACE)
                + ABI_SFA_Constant_Class.STRING_RIGHT_BRACKET + ABI_SFA_Constant_Class.SPACE;

        return result;
    }

    public static String buildMainWhereClauseWithCommonFieldForSearch(String searchString, String commonFieldForSearch) {

        String result = '';
        List<String> searchSubstrings = searchString.split(' ');

        List<String> mainWhereClauses = new List<String>();
        for(String substring : searchSubstrings) {
            mainWhereClauses.add(String.escapeSingleQuotes(commonFieldForSearch) + ABI_SFA_Constant_Class.STRING_LIKE + ABI_SFA_Constant_Class.STRING_APOSTROPHE + ABI_SFA_Constant_Class.STRING_PERCENT
                    + String.escapeSingleQuotes(substring)
                    + ABI_SFA_Constant_Class.STRING_PERCENT + ABI_SFA_Constant_Class.STRING_APOSTROPHE);

        }

        result = ABI_SFA_Constant_Class.SPACE + ABI_SFA_Constant_Class.STRING_LEFT_BRACKET
                + String.join(mainWhereClauses, ABI_SFA_Constant_Class.SPACE + ABI_SFA_Constant_Class.STRING_AND + ABI_SFA_Constant_Class.SPACE)
                + ABI_SFA_Constant_Class.STRING_RIGHT_BRACKET + ABI_SFA_Constant_Class.SPACE;
        return result;
    }


    public static String buildExtendedWhereClause(Map<String, Object> filters) {

        String result = '';

        if (null != filters && !filters.isEmpty()) {

            List<String> extendedWhereClauses = new List<String>();
            for (String field : filters.keySet()) {
                Object criteria = filters.get(field);

                if (criteria instanceof String) {
                    extendedWhereClauses.add(field + ABI_SFA_Constant_Class.STRING_EQUALS
                            + ABI_SFA_Constant_Class.STRING_APOSTROPHE
                            + String.escapeSingleQuotes((String) criteria)
                            + ABI_SFA_Constant_Class.STRING_APOSTROPHE);
                }

                if (criteria instanceof List<Object>) {
                    List<String> strings = new List<String>();
                    for (Object item : (List<Object>) criteria) {
                        strings.add(String.escapeSingleQuotes((String) item));
                    }

                    extendedWhereClauses.add(field + ABI_SFA_Constant_Class.SPACE + ABI_SFA_Constant_Class.STR_IN_CODE
                            + ABI_SFA_Constant_Class.STRING_LEFT_BRACKET
                            + ABI_SFA_Constant_Class.STRING_APOSTROPHE
                            + String.join(strings, ABI_SFA_Constant_Class.STRING_APOSTROPHE + ABI_SFA_Constant_Class.STRING_COMMA + ABI_SFA_Constant_Class.STRING_APOSTROPHE)
                            + ABI_SFA_Constant_Class.STRING_APOSTROPHE
                            + ABI_SFA_Constant_Class.STRING_RIGHT_BRACKET
                    );
                }
            }

            if (!extendedWhereClauses.isEmpty()) {
                result = ABI_SFA_Constant_Class.SPACE + String.join(extendedWhereClauses, ABI_SFA_Constant_Class.SPACE + ABI_SFA_Constant_Class.STRING_AND + ABI_SFA_Constant_Class.SPACE);
            }
        }

        return result;
    }

    public static Boolean isObjectExist(String objectName) {
        return null != Type.forName(objectName);
    }
}