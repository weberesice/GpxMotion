<?php
/**
 * ownCloud - gpxmotion
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * @author Julien Veyssier <eneiluj@gmx.fr>
 * @copyright Julien Veyssier 2017
 */

namespace OCA\GpxMotion\Controller;

use OCP\App\IAppManager;

use OCP\IURLGenerator;
use OCP\IConfig;

use OCP\AppFramework\Http;
use OCP\AppFramework\Http\RedirectResponse;

use OCP\AppFramework\Http\ContentSecurityPolicy;

use OCP\IRequest;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http\Response;
use OCP\AppFramework\Controller;

function delTree($dir) {
    $files = array_diff(scandir($dir), array('.','..'));
    foreach ($files as $file) {
        (is_dir("$dir/$file")) ? delTree("$dir/$file") : unlink("$dir/$file");
    }
    return rmdir($dir);
}

/**
 * Recursive find files from name pattern
 */
function globRecursive($path, $find, $recursive=True) {
    $result = Array();
    $dh = opendir($path);
    while (($file = readdir($dh)) !== false) {
        if (substr($file, 0, 1) === '.') continue;
        $rfile = "{$path}/{$file}";
        if (is_dir($rfile) and $recursive) {
            foreach (globRecursive($rfile, $find) as $ret) {
                array_push($result, $ret);
            }
        } else {
            if (fnmatch($find, $file)){
                array_push($result, $rfile);
            }
        }
    }
    closedir($dh);
    return $result;
}

/*
 * search into all directories in PATH environment variable
 * to find a program and return it if found
 */
function getProgramPath($progname){
    $path_ar = explode(':',getenv('path'));
    $path_ar = array_merge($path_ar, explode(':',getenv('PATH')));
    foreach ($path_ar as $path){
        $supposed_gpath = $path.'/'.$progname;
        if (file_exists($supposed_gpath) and
            is_executable($supposed_gpath)){
            return $supposed_gpath;
        }
    }
    return null;
}

function endswith($string, $test) {
    $strlen = strlen($string);
    $testlen = strlen($test);
    if ($testlen > $strlen) return false;
    return substr_compare($string, $test, $strlen - $testlen, $testlen) === 0;
}

class PageController extends Controller {

    private $userId;
    private $userfolder;
    private $config;
    private $appVersion;
    private $userAbsoluteDataPath;
    private $shareManager;
    private $dbconnection;
    private $dbtype;
    private $dbdblquotes;

    public function __construct($AppName, IRequest $request, $UserId,
                                $userfolder, $config, $shareManager, IAppManager $appManager){
        parent::__construct($AppName, $request);
        $this->appVersion = $config->getAppValue('gpxmotion', 'installed_version');
        $this->userId = $UserId;
        $this->dbtype = $config->getSystemValue('dbtype');
        // IConfig object
        $this->config = $config;

        if ($this->dbtype === 'pgsql'){
            $this->dbdblquotes = '"';
        }
        else{
            $this->dbdblquotes = '';
        }
        if ($UserId !== '' and $userfolder !== null){
            // path of user files folder relative to DATA folder
            $this->userfolder = $userfolder;
            // absolute path to user files folder
            $this->userAbsoluteDataPath =
                $this->config->getSystemValue('datadirectory').
                rtrim($this->userfolder->getFullPath(''), '/');

            // make cache if it does not exist
            $cachedirpath = $this->userAbsoluteDataPath.'/../cache';
            if (! is_dir($cachedirpath)){
                mkdir($cachedirpath);
            }

            $this->dbconnection = \OC::$server->getDatabaseConnection();
        }
        //$this->shareManager = \OC::$server->getShareManager();
        $this->shareManager = $shareManager;
    }

    /**
     * Welcome page.
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function index() {
        $userFolder = \OC::$server->getUserFolder();
        $userfolder_path = $userFolder->getPath();

        $tss = $this->getUserTileServers('tile');
        $oss = $this->getUserTileServers('overlay');

        // PARAMS to view

		require_once('tileservers.php');
        $params = [
            'username'=>$this->userId,
			'basetileservers'=>$baseTileServers,
			'tileservers'=>$tss,
			'overlayservers'=>$oss,
            'gpxmotion_version'=>$this->appVersion
        ];
        $response = new TemplateResponse('gpxmotion', 'main', $params);
        $csp = new ContentSecurityPolicy();
        $csp->addAllowedImageDomain('*')
            ->addAllowedMediaDomain('*')
            ->addAllowedChildSrcDomain('*')
            ->addAllowedObjectDomain('*')
            ->addAllowedScriptDomain('*')
            //->allowEvalScript('*')
            ->addAllowedConnectDomain('*');
        $response->setContentSecurityPolicy($csp);
        return $response;
    }

    /**
     * view page.
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function view() {
        $userFolder = \OC::$server->getUserFolder();
        $userfolder_path = $userFolder->getPath();

        $tss = $this->getUserTileServers('tile');
        $oss = $this->getUserTileServers('overlay');

        // PARAMS to view

		require_once('tileservers.php');
        $params = [
            'username'=>$this->userId,
			'basetileservers'=>$baseTileServers,
			'tileservers'=>$tss,
			'overlayservers'=>$oss,
            'gpxmotion_version'=>$this->appVersion
        ];
        $response = new TemplateResponse('gpxmotion', 'view', $params);
        $csp = new ContentSecurityPolicy();
        $csp->addAllowedImageDomain('*')
            ->addAllowedMediaDomain('*')
            ->addAllowedChildSrcDomain('*')
            ->addAllowedObjectDomain('*')
            ->addAllowedScriptDomain('*')
            ->addAllowedConnectDomain('*');
        $response->setContentSecurityPolicy($csp);
        return $response;
    }

    /**
     * @NoAdminRequired
     */
    public function getgpx($path) {
        $userFolder = \OC::$server->getUserFolder();
        $cleanpath = str_replace(array('../', '..\\'), '',  $path);
        $gpxContent = '';
        if ($userFolder->nodeExists($cleanpath)){
            $file = $userFolder->get($cleanpath);
            if ($file->getType() === \OCP\Files\FileInfo::TYPE_FILE){
                if (endswith($file->getName(), '.GPX') or endswith($file->getName(), '.gpx')){
                    $gpxContent = $file->getContent();
                }
            }
            else{
                $file = null;
            }
        }

        $response = new DataResponse(
            [
                'gpx'=>$gpxContent
            ]
        );
        $csp = new ContentSecurityPolicy();
        $csp->addAllowedImageDomain('*')
            ->addAllowedMediaDomain('*')
            ->addAllowedConnectDomain('*');
        $response->setContentSecurityPolicy($csp);
        return $response;
    }

    /**
     * Handle public link
     *
     * @NoAdminRequired
     * @NoCSRFRequired
     * @PublicPage
     */
    public function publicview() {
        if (!empty($_GET)){
            $dbconnection = \OC::$server->getDatabaseConnection();
            $token = $_GET['token'];
            $path = '';
            $filename = '';
            if (isset($_GET['path'])){
                $path = $_GET['path'];
            }
            if (isset($_GET['filename'])){
                $filename = $_GET['filename'];
            }

            if ($path && $filename){
                if ($path !== '/'){
                    $dlpath = rtrim($path, '/');
                }
                else{
                    $dlpath = $path;
                }
                $dl_url = $token.'/download?path='.$dlpath;
                $dl_url .= '&files='.$filename;
            }
            else{
                $dl_url = $token.'/download';
            }

            $share = $this->shareManager->getShareByToken($token);
            $user = $share->getSharedBy();
            $passwd = $share->getPassword();
            $shareNode = $share->getNode();
            $nodeid = $shareNode->getId();
            $uf = \OC::$server->getUserFolder($user);

            if ($passwd === null){
                if ($path && $filename){
                    if ($shareNode->nodeExists($path.'/'.$filename)){
                        $theid = $shareNode->get($path.'/'.$filename)->getId();
                        // we get the node for the user who shared
                        // (the owner may be different if the file is shared from user to user)
                        $thefile = $uf->getById($theid)[0];
                    }
                    else{
                        return 'This file is not a public share';
                    }
                }
                else{
                    $thefile = $uf->getById($nodeid)[0];
                }

                if ($thefile->getType() === \OCP\Files\FileInfo::TYPE_FILE){
                    $userfolder_path = $uf->getPath();
                    $rel_file_path = str_replace($userfolder_path, '', $thefile->getPath());
                    $gpxContent = $thefile->getContent();

                }
                else{
                    return 'This file is not a public share';
                }
            }
            else{
                return 'This file is not a public share';
            }
        }

        // PARAMS to send to template

        require_once('tileservers.php');
        $params = [
            'basetileservers'=>$baseTileServers,
            'tileservers'=>Array(),
            'overlayservers'=>Array(),
            'publicgpx'=>$gpxContent,
            'token'=>$dl_url,
            'gpxmotion_version'=>$this->appVersion
        ];
        $response = new TemplateResponse('gpxmotion', 'view', $params);
        $csp = new ContentSecurityPolicy();
        $csp->addAllowedImageDomain('*')
            ->addAllowedMediaDomain('*')
            ->addAllowedChildSrcDomain('*')
            ->addAllowedObjectDomain('*')
            ->addAllowedScriptDomain('*')
            ->addAllowedConnectDomain('*');
        $response->setContentSecurityPolicy($csp);
        return $response;
    }

    /**
     * @NoAdminRequired
     */
    public function savegpx($path, $content) {
        $userFolder = \OC::$server->getUserFolder();
        $cleanpath = str_replace(array('../', '..\\'), '',  $path);
        $status = false;
        if (endswith($cleanpath, '.GPX') or endswith($cleanpath, '.gpx')){
            if ($userFolder->nodeExists($cleanpath)){
                $file = $userFolder->get($cleanpath);
                if ($file->getType() === \OCP\Files\FileInfo::TYPE_FILE and
                    $file->isUpdateable()){
                    $file->putContent($content);
                    $status = true;
                }
                else{
                    $status = 'fiw';
                }
            }
            else{
                $dirpath = dirname($cleanpath);
                $newFileName = basename($cleanpath);
                if ($userFolder->nodeExists($dirpath)){
                    $dir = $userFolder->get($dirpath);
                    if ($dir->getType() === \OCP\Files\FileInfo::TYPE_FOLDER and
                        $dir->isCreatable()){
                        $dir->newFile($newFileName);
                        $dir->get($newFileName)->putContent($content);
                        $status = true;
                    }
                    else{
                        $status = 'fw';
                    }
                }
                else{
                    $status = 'fu';
                }
            }
        }
        else{
            $status = 'bfn';
        }

        $response = new DataResponse(
            [
                'status'=>$status
            ]
        );
        $csp = new ContentSecurityPolicy();
        $csp->addAllowedImageDomain('*')
            ->addAllowedMediaDomain('*')
            ->addAllowedConnectDomain('*');
        $response->setContentSecurityPolicy($csp);
        return $response;
    }

    /*
     * quote and choose string escape function depending on database used
     */
    private function db_quote_escape_string($str){
        return $this->dbconnection->quote($str);
    }

    private function getUserTileServers($type){
        // custom tile servers management
        $sqlts = 'SELECT servername, url FROM *PREFIX*gpxmotion_tile_servers ';
        $sqlts .= 'WHERE '.$this->dbdblquotes.'user'.$this->dbdblquotes.'='.$this->db_quote_escape_string($this->userId).' ';
        $sqlts .= 'AND type='.$this->db_quote_escape_string($type).';';
        $req = $this->dbconnection->prepare($sqlts);
        $req->execute();
        $tss = Array();
        while ($row = $req->fetch()){
            $tss[$row["servername"]] = $row["url"];
        }
        $req->closeCursor();
        return $tss;
    }

}
