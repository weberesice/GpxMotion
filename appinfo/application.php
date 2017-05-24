<?php
/**
 * ownCloud - gpxmotion
 *
 *
 * @author
 *
 * @copyright
 */

namespace OCA\GpxMotion\AppInfo;



use OCP\IContainer;

use OCP\AppFramework\App;
use OCP\AppFramework\IAppContainer;

use OCA\GpxMotion\Controller\PageController;
use OCA\GpxMotion\Controller\ComparisonController;
use OCA\GpxMotion\Controller\UtilsController;

/**
 * Class Application
 *
 * @package OCA\GpxMotion\AppInfo
 */
class Application extends App {

    /**
     * Constructor
     *
     * @param array $urlParams
     */
    public function __construct(array $urlParams = []) {
        parent::__construct('gpxmotion', $urlParams);

        $container = $this->getContainer();

        /**
         * Controllers
         */
        $container->registerService(
            'PageController', function (IAppContainer $c) {
                return new PageController(
                    $c->query('AppName'),
                    $c->query('Request'),
                    $c->query('UserId'),
                    $c->query('ServerContainer')->getUserFolder($c->query('UserId')),
                    $c->query('ServerContainer')->getConfig(),
                    $c->getServer()->getShareManager(),
                    $c->getServer()->getAppManager()
                );
            }
        );

        $container->registerService(
            'UtilsController', function (IAppContainer $c) {
                return new UtilsController(
                    $c->query('AppName'),
                    $c->query('Request'),
                    $c->query('UserId'),
                    //$c->getServer()->getUserFolder($c->query('UserId')),
                    //$c->query('OCP\IConfig'),
                    $c->query('ServerContainer')->getUserFolder($c->query('UserId')),
                    $c->query('ServerContainer')->getConfig(),
                    $c->getServer()->getAppManager()
                );
            }
        );

    }

}

