<?php

use Google\Cloud\Translate\V3\TranslationServiceClient;

/**
 * Created by PhpStorm.
 * User: vincenzoruffa
 * Date: 28/12/2017
 * Time: 17:25
 */


class Engines_GoogleTranslateV3 extends Engines_AbstractEngine {

    use \Engines\Traits\FormatResponse;

    protected $_config = array(
            'q'           => null,
            'source'      => null,
            'target'      => null,
    );

    public function __construct($engineRecord) {
        parent::__construct($engineRecord);
        if ( $this->engineRecord->type != "MT" ) {
            throw new Exception( "Engine {$this->engineRecord->id} is not a MT engine, found {$this->engineRecord->type} -> {$this->engineRecord->class_load}" );
        }
    }

    /**
     * @param $rawValue
     *
     * @return array
     */
    protected function _decode( $rawValue ) {

        $all_args =  func_get_args();
        $all_args[ 1 ][ 'text' ] = $all_args[ 1 ][ 'q' ];

        if ( is_string( $rawValue ) ) {
            $decoded = json_decode( $rawValue, true );
            if ( isset( $decoded[ "data" ] ) ) {
                return $this->_composeResponseAsMatch( $all_args, $decoded );
            } else {
                $decoded = [
                        'error' => [
                                'code'    => $decoded[ "code" ],
                                'message' => $decoded[ "message" ]
                        ]
                ];
            }
        } else {
            $resp = json_decode( $rawValue[ "error" ][ "response" ], true );
            if ( isset( $resp[ "error" ][ "code" ] ) && isset( $resp[ "error" ][ "message" ] ) ) {
                $rawValue[ "error" ][ "code" ]    = $resp[ "error" ][ "code" ];
                $rawValue[ "error" ][ "message" ] = $resp[ "error" ][ "message" ];
            }
            $decoded = $rawValue; // already decoded in case of error
        }

        return $decoded;

    }

    public function get( $_config ) {

        $projectId = $_config['project_id'];
        $credentials = $_config['credentials'];

        $translationClient = new TranslationServiceClient([
                'credentials' => json_decode($credentials, true)
        ]);

        $response = $translationClient->translateText(
                [$this->_preserveSpecialStrings($_config['segment'])],
                $this->_fixLangCode( $_config['target'] ),
                TranslationServiceClient::locationName($projectId, 'global')
        );

        foreach ($response->getTranslations() as $key => $translation) {
            $googleTranslation = $translation->getTranslatedText();
        }

        return ( new Engines_Results_MyMemory_Matches(
                $_config[ 'segment' ],
                $googleTranslation,
                100 - $this->getPenalty() . "%",
                "MT-" . $this->getName(),
                date( "Y-m-d" )
        ) )->getMatches();
    }

    public function set( $_config ) {

        //if engine does not implement SET method, exit
        return true;
    }

    public function update( $config ) {

        //if engine does not implement UPDATE method, exit
        return true;
    }

    public function delete( $_config ) {

        //if engine does not implement DELETE method, exit
        return true;

    }

}
