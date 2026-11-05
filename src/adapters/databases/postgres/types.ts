export type CatalogTable = {
    id: string;
    name: string;
    namespace: string;
    kind: 'r' | 'p' | 'v' | 'm' | 'f';
};

export type CatalogColumn = CatalogTable & {
    accessible: boolean;
    column_id: string | null;
    column_name: string;
    native_type: string;
    nullable: boolean;
    base_name: string;
    type_namespace: string;
    default_expression: string | null;
    identity: '' | 'a' | 'd';
    generated: '' | 's' | 'v';
    generation_expression: string | null;
    primary_key: string[];
};
