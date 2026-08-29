# Core Type Definitions

/**
 * Firmware family types supported by the editor
 */
export type FirmwareFamily = "aptio-v" | "aptio-iv";

/**
 * Condition kinds for form element visibility control
 */
export type ConditionKind = "SuppressIf" | "GrayOutIf" | "DisableIf";

/**
 * Source of a condition - where the variable originates from
 */
export type ConditionSource =
  | "setup"
  | "hardware"
  | "access"
  | "ui"
  | "runtime"
  | "constant"
  | "unknown";

/**
 * Visibility status of a form element
 */
export type VisibilityStatus =
  | "visible"
  | "hidden"
  | "conditional"
  | "unknown"
  | "orphaned"
  | "broken";

/**
 * Reachability status of a menu node in the tree
 */
export type ReachabilityStatus =
  | "root"
  | "reachable"
  | "detached"
  | "broken";

/**
 * Source of a menu root
 */
export type RootSource =
  | "amitse"
  | "setupdata"
  | "hii-formset"
  | "inferred";

/**
 * Menu item representing a form navigation entry
 */
export interface MenuItem {
  readonly name: string;
  readonly formId: string;
  readonly offset: string | null;
  readonly formSetGuid?: string;
  readonly source?: "amitse" | "setupdata" | "formset";
  readonly pageMask?: string;
  readonly pageInfoOffset?: string;
}

/**
 * Collection of menu items
 */
export type Menu = readonly MenuItem[];

/**
 * Offset values for form elements
 */
export interface Offsets {
  readonly accessLevel: string;
  readonly failsafe: string;
  readonly optimal: string;
  readonly pageId?: string;
}

/**
 * Base interface for all form child elements
 */
export interface FormChildBase {
  readonly name: string;
  readonly description: string;
  readonly questionId: string;
  readonly varStoreId: string;
  readonly varStoreName?: string;
  readonly accessLevel: string | null;
  readonly failsafe: string | null;
  readonly optimal: string | null;
  readonly offsets: Offsets | null;
  readonly suppressIf?: readonly string[];
  readonly conditions?: readonly string[];
}

/**
 * Reference prompt - links to another form
 */
export interface RefPrompt extends FormChildBase {
  readonly type: "Ref";
  readonly formId: string;
  readonly targetFormSetGuid?: string;
  readonly pageId: string | null;
}

/**
 * Numeric input prompt
 */
export interface NumericPrompt extends FormChildBase {
  readonly type: "Numeric";
  readonly varOffset: string;
  readonly size: string;
  readonly min: string;
  readonly max: string;
  readonly step: string;
  readonly defaults?: readonly Default[];
}

/**
 * Checkbox prompt
 */
export interface CheckBoxPrompt extends FormChildBase {
  readonly type: "CheckBox";
  readonly varOffset: string;
  readonly flags: string;
  readonly defaults?: readonly Default[];
}

/**
 * Dropdown/enum selection prompt
 */
export interface OneOfPrompt extends FormChildBase {
  readonly type: "OneOf";
  readonly varOffset: string;
  readonly size: string;
  readonly options: readonly Option[];
  readonly defaults?: readonly Default[];
}

/**
 * String input prompt
 */
export interface StringPrompt extends FormChildBase {
  readonly type: "String";
}

/**
 * Union type of all possible form child types
 */
export type FormChildren =
  | RefPrompt
  | NumericPrompt
  | CheckBoxPrompt
  | OneOfPrompt
  | StringPrompt;

/**
 * Form definition with its children
 */
export interface Form {
  readonly name: string;
  readonly type: "Form";
  readonly formId: string;
  readonly formSetGuid?: string;
  readonly formSetTitle?: string;
  readonly referencedIn: readonly string[];
  readonly children: readonly FormChildren[];
}

/**
 * Collection of forms
 */
export type Forms = readonly Form[];

/**
 * Variable store definition
 */
export interface VarStore {
  readonly varStoreId: string;
  readonly size: string;
  readonly name: string;
  readonly formSetGuid?: string;
}

/**
 * Collection of variable stores
 */
export type VarStores = readonly VarStore[];

/**
 * Suppression rule for conditional visibility
 */
export interface Suppression {
  readonly offset: string;
  readonly active: boolean;
  readonly start: string;
  readonly end: string;
  readonly kind?: ConditionKind;
  readonly expression?: string;
  readonly questionIds?: readonly string[];
  readonly varStoreIds?: readonly string[];
  readonly varStoreNames?: readonly string[];
  readonly source?: ConditionSource;
  readonly constant?: boolean | null;
  readonly formSetGuid?: string;
}

/**
 * Default value definition
 */
export interface Default {
  readonly defaultId: string;
  readonly value: string;
}

/**
 * Option for OneOf prompts
 */
export interface Option {
  readonly option: string;
  readonly value: string;
}

/**
 * Main data structure containing all firmware setup information
 */
export interface Data {
  readonly firmwareFamily: FirmwareFamily;
  readonly menu: Menu;
  readonly formSetRoots?: Menu;
  readonly varStores: VarStores;
  readonly forms: Forms;
  readonly suppressions: readonly Suppression[];
  readonly version: string;
  readonly hashes: Hashes;
}

/**
 * Hash values for integrity verification
 */
export interface Hashes {
  readonly setupTxt: string;
  readonly setupSct: string;
  readonly amitseSct: string;
  readonly setupdataBin: string;
  readonly offsetChecksum: string;
}

/**
 * Scope tracking for IFR parsing
 */
export interface Scope {
  readonly type:
    | "Form"
    | "Numeric"
    | "CheckBox"
    | "OneOf"
    | "String"
    | ConditionKind;
  readonly indentations: number;
  readonly offset?: string;
}

/**
 * Collection of scopes
 */
export type Scopes = readonly Scope[];
