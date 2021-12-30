<?php
/**
 * Created by PhpStorm.
 * User: vincenzoruffa
 * Date: 28/12/2017
 * Time: 12:06
 */

/**
 * Class EnginesModel_GoogleTranslateStruct
 *
 * This class contains the default parameters for a Google Translate Engine CREATION
 *
 */
class EnginesModel_GoogleTranslateV3Struct extends EnginesModel_EngineStruct {

    /**
     * @var string
     */
    public $description = "Google Translate V3";

    /**
     * @var string
     */
    public $base_url = "https://translation.googleapis.com";

    /**
     * @var string
     */
    public $translate_relative_url = "language/translate/v3";

    /**
     * @var array
     */
    public $extra_parameters = array(
            'project_id' => "",
            'credentials' => "",
    );

    /**
     * @var string
     */
    public $class_load = Constants_Engines::GOOGLE_TRANSLATE_V3;


    /**
     * @var int
     */
    public $google_api_compliant_version = 3;

    /**
     * @var int
     */
    public $penalty = 14;

    /**
     * An empty struct
     * @return EnginesModel_GoogleTranslateV3Struct
     */
    public static function getStruct() {
        return new EnginesModel_GoogleTranslateV3Struct();
    }

}
