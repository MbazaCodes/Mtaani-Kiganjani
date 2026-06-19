package tz.go.e_serikali_mtaa;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(com.getcapacitor.splashscreen.SplashScreenPlugin.class);
        registerPlugin(com.getcapacitor.statusbar.StatusBarPlugin.class);
        registerPlugin(com.getcapacitor.app.AppPlugin.class);
        registerPlugin(com.getcapacitor.haptics.HapticsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
